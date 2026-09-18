import "server-only";

import { createClient } from "./server";

/**
 * Every Storage bucket in this project is private (see
 * supabase/migrations/0002_storage.sql), so images are never reachable via a
 * bare public URL. Call this in a Server Component to resolve a stored path
 * (e.g. "avatars/<profile_id>/photo.jpg") to a short-lived signed URL.
 */
export async function getSignedStorageUrl(
  bucket: "avatars" | "company-logos" | "feed-media" | "documents",
  path: string | null,
  expiresIn = 3600
): Promise<string | null> {
  if (!path) return null;

  const supabase = await createClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}
