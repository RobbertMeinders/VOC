import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ImageUploadResult = { path: string } | { error: string };

function randomFileName(): string {
  // Avoid depending on the global Web Crypto API being present in every
  // runtime — build the id from Math.random if crypto.randomUUID is missing.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Uploads an image to a private bucket at `<folder>/<random>.<ext>`, replacing
 * any previous file in that folder. `folder` must match what the bucket's
 * RLS policy scopes ownership to (e.g. the profile_id for `avatars`).
 */
export async function uploadImage(
  supabase: SupabaseClient<Database>,
  bucket: "avatars" | "company-logos" | "activity-images",
  folder: string,
  file: File
): Promise<ImageUploadResult> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { error: `Alleen PNG, JPEG of WebP-afbeeldingen zijn toegestaan (kreeg: ${file.type || "onbekend"}).` };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "De afbeelding mag maximaal 5 MB zijn." };
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${folder}/${randomFileName()}.${extension}`;

  try {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      return { error: `Uploaden is niet gelukt: ${error.message}` };
    }

    return { path };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "onbekende fout";
    return { error: `Uploaden is niet gelukt: ${message}` };
  }
}
