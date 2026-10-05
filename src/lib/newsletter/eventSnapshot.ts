import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { randomFileName } from "@/lib/supabase/randomFileName";
import type { NewsletterEventBlock } from "./types";

type Activity = Database["public"]["Tables"]["activities"]["Row"];

// Het origineel staat in de besloten activity-images-bucket (signed URL,
// verloopt na een uur) — een nieuwsbrief kan weken later nog geopend
// worden, dus het Evenement-blok heeft zijn eigen, permanente kopie nodig
// in de publieke email-assets-bucket (dezelfde bucket die de losse
// Afbeelding-blokken en e-mailtemplates al gebruiken).
async function copyActivityImageToEmailAssets(
  supabase: SupabaseClient<Database>,
  imagePath: string | null
): Promise<string | null> {
  if (!imagePath) return null;

  const signedUrl = await getSignedStorageUrl("activity-images", imagePath);
  if (!signedUrl) return null;

  try {
    const response = await fetch(signedUrl);
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const blob = await response.blob();
    const path = `nieuwsbrieven-evenementen/${randomFileName()}.${extension}`;

    const { error } = await supabase.storage.from("email-assets").upload(path, blob, { contentType, upsert: false });
    if (error) {
      console.error("[newsletter] copyActivityImageToEmailAssets upload failed:", error);
      return null;
    }
    return supabase.storage.from("email-assets").getPublicUrl(path).data.publicUrl;
  } catch (cause) {
    console.error("[newsletter] copyActivityImageToEmailAssets threw:", cause);
    return null;
  }
}

/**
 * Bouwt een momentopname van een activiteit voor een Evenement-blok —
 * gebruikt zowel bij "Communiceer over dit evenement" (nieuw blok) als bij
 * het verversen van een bestaand blok in de editor. Nooit een live
 * koppeling: wat hier wordt teruggegeven staat vast totdat er opnieuw
 * expliciet ververst wordt.
 */
export async function buildEventSnapshot(
  supabase: SupabaseClient<Database>,
  activity: Activity,
  existingBlockId?: string
): Promise<NewsletterEventBlock> {
  const imageUrl = await copyActivityImageToEmailAssets(supabase, activity.image_url);
  const siteUrl = (process.env.SITE_URL ?? "").replace(/\/$/, "");

  return {
    id: existingBlockId ?? randomFileName(),
    type: "event",
    activityId: activity.id,
    title: activity.title,
    startsAtIso: activity.starts_at,
    endsAtIso: activity.ends_at,
    location: activity.location,
    description: activity.description,
    imageUrl,
    linkUrl: `${siteUrl}/agenda/${activity.id}`,
  };
}
