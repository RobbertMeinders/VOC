import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { createClient } from "./server";

type Bucket = "avatars" | "company-logos" | "feed-media" | "documents" | "activity-images" | "activity-attachments";

// Elke signed URL kreeg tot nu toe bij elke aanroep een gloednieuwe, unieke
// token — ook voor exact hetzelfde bestand. Omdat die URL de cache-sleutel
// is voor zowel Next.js' eigen image-optimizer als de browser, werd elke
// avatar/logo/foto op elke paginaweergave, voor elk lid, opnieuw
// gedownload én opnieuw geoptimaliseerd i.p.v. dat één keer te doen en te
// hergebruiken. De leesrechten op alle buckets zijn hetzelfde voor elk
// actief lid (zie supabase/migrations/0002_storage.sql), dus een signed URL
// in het geheugen cachen per (bucket, pad) en delen tussen leden/requests
// geeft niemand toegang tot iets waar diegene zelf niet ook een signed URL
// voor had kunnen aanvragen. `CACHE_TTL_MS` ligt ruim onder `expiresIn`
// (in seconden), zodat een gecachete URL nooit al verlopen is op het moment
// dat 'm wordt gebruikt. Dit is een simpele per-serverproces cache (geen
// gedeeld cache-framework) — al is dat maar één warme instance, dat scheelt
// al enorm t.o.v. eerder, waar zelfs twee requests ná elkaar op dezelfde
// instance nooit dezelfde URL kregen.
const CACHE_TTL_MS = 30 * 60 * 1000;
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

function cacheKey(bucket: Bucket, path: string, expiresIn: number): string {
  return `${bucket}:${path}:${expiresIn}`;
}

async function cachedCreateSignedUrl(
  supabase: SupabaseClient<Database>,
  bucket: Bucket,
  path: string,
  expiresIn: number
): Promise<string | null> {
  const key = cacheKey(bucket, path, expiresIn);
  const cached = signedUrlCache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (data?.signedUrl) {
    signedUrlCache.set(key, { url: data.signedUrl, expiresAt: now + CACHE_TTL_MS });
  }
  return data?.signedUrl ?? null;
}

/**
 * Every Storage bucket in this project is private (see
 * supabase/migrations/0002_storage.sql), so images are never reachable through
 * a bare public URL. Call this in a Server Component to resolve a stored path
 * (e.g. "avatars/<profile_id>/photo.jpg") to a short-lived signed URL.
 *
 * For a list of items (a feed page, a member list), use
 * `getSignedStorageUrls` instead — one call per bucket instead of one call
 * per image keeps pages with many avatars from timing out.
 */
export async function getSignedStorageUrl(bucket: Bucket, path: string | null, expiresIn = 3600): Promise<string | null> {
  if (!path) return null;

  try {
    const supabase = await createClient();
    return await cachedCreateSignedUrl(supabase, bucket, path, expiresIn);
  } catch {
    // A bucket that doesn't exist yet (a pending migration) or a transient
    // Storage API error shouldn't take the whole page down — just render
    // without that image.
    return null;
  }
}

/**
 * Batch-resolves many storage paths (dedupes repeats, e.g. the same author's
 * avatar appearing on several posts) — each path is cached individually (see
 * `cachedCreateSignedUrl`), so a path already signed for some other page is
 * reused here too instead of re-signed. Cache misses go out in parallel
 * (one Storage API request per path, concurrently) rather than one after
 * another. Returns a lookup you can index with the original path; a path
 * that failed to sign (or wasn't asked for) is simply absent from the map.
 */
export async function getSignedStorageUrls(
  supabase: SupabaseClient<Database>,
  bucket: Bucket,
  paths: (string | null | undefined)[],
  expiresIn = 3600
): Promise<Map<string, string>> {
  const uniquePaths = Array.from(new Set(paths.filter((p): p is string => Boolean(p))));
  const map = new Map<string, string>();
  if (uniquePaths.length === 0) return map;

  try {
    const results = await Promise.all(
      uniquePaths.map(async (path) => [path, await cachedCreateSignedUrl(supabase, bucket, path, expiresIn)] as const)
    );
    for (const [path, url] of results) {
      if (url) map.set(path, url);
    }
  } catch {
    // Same reasoning as getSignedStorageUrl: fail soft, not the whole page.
  }
  return map;
}
