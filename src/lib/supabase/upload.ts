import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { randomFileName } from "./randomFileName";

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/avif"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ImageUploadResult = { path: string } | { error: string };

// Reduceert het risico van een SVG-upload met ingebed script: via <img src>
// (hoe avatars/logo's overal getoond worden) voert de browser zoiets sowieso
// al niet uit, maar wie de opgeslagen bestands-URL rechtstreeks opent (nieuw
// tabblad, gedeelde link) krijgt zo'n script wél uitgevoerd binnen de
// Storage-origin. Dit is een regex-based, conservatieve strip — geen
// volwaardige XML-parser/sanitizer-library — die de bekende, praktische
// vectoren verwijdert (scripts, event-handlers, javascript:-URI's, en
// elementen die willekeurige HTML/embeds kunnen bevatten). Het is
// defense-in-depth, geen garantie tegen elke denkbare SVG-truc.
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<\s*script\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/(href|xlink:href)\s*=\s*"javascript:[^"]*"/gi, '$1="#"')
    .replace(/(href|xlink:href)\s*=\s*'javascript:[^']*'/gi, "$1='#'")
    .replace(/<\s*(iframe|embed|object|foreignObject)\b[\s\S]*?<\/\s*\1\s*>/gi, "")
    .replace(/<\s*(iframe|embed|object)\b[^>]*\/?>/gi, "");
}

/**
 * Uploads an image to a private bucket at `<folder>/<random>.<ext>`, replacing
 * any previous file in that folder. `folder` must match what the bucket's
 * RLS policy scopes ownership to (e.g. the profile_id for `avatars`).
 */
export async function uploadImage(
  supabase: SupabaseClient<Database>,
  bucket: "avatars" | "company-logos" | "activity-images" | "email-assets" | "news-images",
  folder: string,
  file: File
): Promise<ImageUploadResult> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return {
      error: `Alleen PNG, JPEG, WebP, SVG of AVIF-afbeeldingen zijn toegestaan (kreeg: ${file.type || "onbekend"}).`,
    };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "De afbeelding mag maximaal 5 MB zijn." };
  }

  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/svg+xml"
          ? "svg"
          : file.type === "image/avif"
            ? "avif"
            : "jpg";
  const path = `${folder}/${randomFileName()}.${extension}`;

  const body: File | Blob =
    file.type === "image/svg+xml"
      ? new Blob([sanitizeSvg(await file.text())], { type: "image/svg+xml" })
      : file;

  try {
    const { error } = await supabase.storage.from(bucket).upload(path, body, {
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

/**
 * Best-effort verwijdering van een vervangen avatar/logo/activiteitfoto.
 * Faalt altijd stil (alleen gelogd) — een mislukte opruiming van het OUDE
 * bestand mag nooit de al geslaagde upload/opslag van het NIEUWE bestand
 * blokkeren. Roep dit pas aan nadat de nieuwe avatar_url/logo_url al is
 * weggeschreven, met het oude pad van vóór die wijziging.
 */
export async function removePreviousImage(
  supabase: SupabaseClient<Database>,
  bucket: "avatars" | "company-logos" | "activity-images" | "email-assets" | "news-images",
  previousPath: string | null | undefined
): Promise<void> {
  if (!previousPath) return;

  try {
    const { error } = await supabase.storage.from(bucket).remove([previousPath]);
    if (error) {
      console.error(`[storage] removePreviousImage failed for ${bucket}/${previousPath}:`, error);
    }
  } catch (cause) {
    console.error(`[storage] removePreviousImage threw for ${bucket}/${previousPath}:`, cause);
  }
}
