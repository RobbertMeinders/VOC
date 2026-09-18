import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ImageUploadResult = { path: string } | { error: string };

/**
 * Uploads an image to a private bucket at `<folder>/<random>.<ext>`, replacing
 * any previous file in that folder. `folder` must match what the bucket's
 * RLS policy scopes ownership to (e.g. the profile_id for `avatars`).
 */
export async function uploadImage(
  supabase: SupabaseClient<Database>,
  bucket: "avatars" | "company-logos",
  folder: string,
  file: File
): Promise<ImageUploadResult> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { error: "Alleen PNG, JPEG of WebP-afbeeldingen zijn toegestaan." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "De afbeelding mag maximaal 5 MB zijn." };
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    return { error: "Uploaden is niet gelukt. Probeer het opnieuw." };
  }

  return { path };
}
