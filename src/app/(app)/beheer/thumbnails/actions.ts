"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadImage } from "@/lib/supabase/upload";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import type { Database } from "@/lib/types/database";

export type BackfillCategory = "profiles" | "companies" | "activities" | "feed_attachments";

export type BackfillQueueItem = { id: string; path: string; url: string | null };

export type ThumbnailBackfillQueue = {
  profiles: BackfillQueueItem[];
  companies: BackfillQueueItem[];
  activities: BackfillQueueItem[];
  feedAttachments: BackfillQueueItem[];
};

// SVG is al vectorklein (en createThumbnailFile in de browser rastert 'm
// sowieso niet, zie lib/image/compress.ts) — nooit in de wachtrij, dus de
// teller telt nooit iets wat de backfill toch zou overslaan.
function isSvgPath(path: string): boolean {
  return path.toLowerCase().endsWith(".svg");
}

/**
 * Alles wat nog een kleine versie mist — alleen rijen zonder thumbnail
 * (zo kan deze backfill veilig opnieuw draaien, zie applyThumbnailBackfillAction
 * voor de idempotentie-check per item). Dit IS de droge run: een loutere
 * select heeft geen schrijfeffect, dus de pagina kan deze aanroep gewoon bij
 * het laden doen om de tellingen te tonen, vóór er op "Start" geklikt wordt.
 */
export async function getThumbnailBackfillQueueAction(): Promise<ThumbnailBackfillQueue> {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: profiles }, { data: companies }, { data: activities }, { data: attachments }] = await Promise.all([
    supabase.from("profiles").select("id, avatar_url").not("avatar_url", "is", null).is("avatar_thumb_url", null),
    supabase.from("companies").select("id, logo_url").not("logo_url", "is", null).is("logo_thumb_url", null),
    supabase.from("activities").select("id, image_url").not("image_url", "is", null).is("image_thumb_url", null),
    supabase.from("feed_attachments").select("id, storage_path").eq("type", "image").is("thumb_path", null),
  ]);

  const profileRows = (profiles ?? []).filter((p): p is { id: string; avatar_url: string } => Boolean(p.avatar_url) && !isSvgPath(p.avatar_url!));
  const companyRows = (companies ?? []).filter((c): c is { id: string; logo_url: string } => Boolean(c.logo_url) && !isSvgPath(c.logo_url!));
  const activityRows = (activities ?? []).filter((a): a is { id: string; image_url: string } => Boolean(a.image_url) && !isSvgPath(a.image_url!));
  const attachmentRows = (attachments ?? []).filter((a) => !isSvgPath(a.storage_path));

  const [avatarUrls, logoUrls, activityUrls, attachmentUrls] = await Promise.all([
    getSignedStorageUrls(supabase, "avatars", profileRows.map((p) => p.avatar_url)),
    getSignedStorageUrls(supabase, "company-logos", companyRows.map((c) => c.logo_url)),
    getSignedStorageUrls(supabase, "activity-images", activityRows.map((a) => a.image_url)),
    getSignedStorageUrls(supabase, "feed-media", attachmentRows.map((a) => a.storage_path)),
  ]);

  return {
    profiles: profileRows.map((p) => ({ id: p.id, path: p.avatar_url, url: avatarUrls.get(p.avatar_url) ?? null })),
    companies: companyRows.map((c) => ({ id: c.id, path: c.logo_url, url: logoUrls.get(c.logo_url) ?? null })),
    activities: activityRows.map((a) => ({ id: a.id, path: a.image_url, url: activityUrls.get(a.image_url) ?? null })),
    feedAttachments: attachmentRows.map((a) => ({ id: a.id, path: a.storage_path, url: attachmentUrls.get(a.storage_path) ?? null })),
  };
}

export type ApplyBackfillState = { error?: string; skipped?: boolean };

async function applyForProfile(adminClient: SupabaseClient<Database>, rowId: string, thumb: File): Promise<ApplyBackfillState> {
  const { data: row } = await adminClient.from("profiles").select("avatar_url, avatar_thumb_url").eq("id", rowId).maybeSingle();
  if (!row?.avatar_url) return { error: "Lid of avatarpad niet (meer) gevonden." };
  if (row.avatar_thumb_url) return { skipped: true };

  const folder = row.avatar_url.split("/")[0];
  const result = await uploadImage(adminClient, "avatars", folder, thumb);
  if ("error" in result) return { error: result.error };

  const { error } = await adminClient.from("profiles").update({ avatar_thumb_url: result.path }).eq("id", rowId);
  return error ? { error: "Koppelen van de thumbnail is niet gelukt." } : {};
}

async function applyForCompany(adminClient: SupabaseClient<Database>, rowId: string, thumb: File): Promise<ApplyBackfillState> {
  const { data: row } = await adminClient.from("companies").select("logo_url, logo_thumb_url").eq("id", rowId).maybeSingle();
  if (!row?.logo_url) return { error: "Bedrijf of logopad niet (meer) gevonden." };
  if (row.logo_thumb_url) return { skipped: true };

  const folder = row.logo_url.split("/")[0];
  const result = await uploadImage(adminClient, "company-logos", folder, thumb);
  if ("error" in result) return { error: result.error };

  const { error } = await adminClient.from("companies").update({ logo_thumb_url: result.path }).eq("id", rowId);
  return error ? { error: "Koppelen van de thumbnail is niet gelukt." } : {};
}

async function applyForActivity(adminClient: SupabaseClient<Database>, rowId: string, thumb: File): Promise<ApplyBackfillState> {
  const { data: row } = await adminClient.from("activities").select("image_url, image_thumb_url").eq("id", rowId).maybeSingle();
  if (!row?.image_url) return { error: "Activiteit of afbeeldingspad niet (meer) gevonden." };
  if (row.image_thumb_url) return { skipped: true };

  const folder = row.image_url.split("/")[0];
  const result = await uploadImage(adminClient, "activity-images", folder, thumb);
  if ("error" in result) return { error: result.error };

  const { error } = await adminClient.from("activities").update({ image_thumb_url: result.path }).eq("id", rowId);
  return error ? { error: "Koppelen van de thumbnail is niet gelukt." } : {};
}

async function applyForFeedAttachment(adminClient: SupabaseClient<Database>, rowId: string, thumb: File): Promise<ApplyBackfillState> {
  const { data: row } = await adminClient.from("feed_attachments").select("storage_path, thumb_path").eq("id", rowId).maybeSingle();
  if (!row?.storage_path) return { error: "Bijlage of pad niet (meer) gevonden." };
  if (row.thumb_path) return { skipped: true };

  const folder = row.storage_path.split("/")[0];
  const result = await uploadImage(adminClient, "feed-media", folder, thumb);
  if ("error" in result) return { error: result.error };

  const { error } = await adminClient.from("feed_attachments").update({ thumb_path: result.path }).eq("id", rowId);
  return error ? { error: "Koppelen van de thumbnail is niet gelukt." } : {};
}

/**
 * Eén item uit de wachtrij afhandelen: de browser heeft de thumbnail al
 * (dezelfde createThumbnailFile-canvaslogica als een gewone upload) klaar,
 * deze actie uploadt 'm alleen nog en zet de koppeling — er wordt hier geen
 * enkele afbeelding bewerkt/verkleind, dus geen sharp/optimizer nodig.
 *
 * Service-role i.p.v. de ingelogde beheerder-sessie: deze backfill schrijft
 * doelbewust in de map van de oorspronkelijke eigenaar (bv. een ander lid
 * z'n avatar-map, of een andere auteur z'n feed-media-map). Voor avatars/
 * company-logos/activity-images mag een beheerder dat al via de normale RLS
 * (zie 0010_admin_full_edit.sql / 0002_storage.sql), maar voor feed-media
 * bestaat die uitzondering niet — i.p.v. drie categorieën via de gewone
 * sessie en één via service-role, lopen alle vier hetzelfde, voorspelbare
 * pad. Zie lib/supabase/admin.ts voor wanneer service-role hier terecht is;
 * dit is precies zo'n eenmalig, bewust begrensd beheer-stuk.
 *
 * Elk item valt terug op zijn eigen rij: als de thumb-kolom intussen al
 * gezet is (een eerdere, deels geslaagde run, of een gewone upload die
 * ondertussen gebeurde) wordt dit item overgeslagen i.p.v. opnieuw
 * geüpload — dat is tegelijk de hele "opnieuw draaien is veilig"-garantie.
 */
export async function applyThumbnailBackfillAction(formData: FormData): Promise<ApplyBackfillState> {
  await requireAdmin();

  const category = String(formData.get("category") ?? "") as BackfillCategory;
  const rowId = String(formData.get("rowId") ?? "");
  const thumb = formData.get("thumb");

  if (!rowId || !(thumb instanceof File) || thumb.size === 0) {
    return { error: "Ongeldige aanvraag." };
  }

  const adminClient = createAdminClient();

  switch (category) {
    case "profiles":
      return applyForProfile(adminClient, rowId, thumb);
    case "companies":
      return applyForCompany(adminClient, rowId, thumb);
    case "activities":
      return applyForActivity(adminClient, rowId, thumb);
    case "feed_attachments":
      return applyForFeedAttachment(adminClient, rowId, thumb);
    default:
      return { error: "Onbekende categorie." };
  }
}
