import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { createClient } from "./server";

type Bucket = "avatars" | "company-logos" | "feed-media" | "documents" | "activity-images" | "activity-attachments";

/**
 * Every Storage bucket in this project is private (see
 * supabase/migrations/0002_storage.sql), so images are never reachable via a
 * bare public URL. Call this in a Server Component to resolve a stored path
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
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    return data?.signedUrl ?? null;
  } catch {
    // A bucket that doesn't exist yet (a pending migration) or a transient
    // Storage API error shouldn't take the whole page down — just render
    // without that image.
    return null;
  }
}

/**
 * Batch-resolves many storage paths in a single Storage API call (dedupes
 * repeats, e.g. the same author's avatar appearing on several posts).
 * Returns a lookup you can index with the original path; a path that
 * failed to sign (or wasn't asked for) is simply absent from the map.
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
    const { data } = await supabase.storage.from(bucket).createSignedUrls(uniquePaths, expiresIn);
    for (const item of data ?? []) {
      if (item.signedUrl && !item.error && item.path) {
        map.set(item.path, item.signedUrl);
      }
    }
  } catch {
    // Same reasoning as getSignedStorageUrl: fail soft, not the whole page.
  }
  return map;
}
