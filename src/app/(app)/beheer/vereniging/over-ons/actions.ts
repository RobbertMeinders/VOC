"use server";

import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { removePreviousImage, uploadImage } from "@/lib/supabase/upload";
import { logAuditAction } from "@/lib/audit/log";

export type UpdateOrgProfileState = { error?: string; success?: boolean };

// is_board() i.p.v. requireAdmin: dit is inhoudelijke verenigingstekst, geen
// technische instelling — zie RLS op org_profile (0107_...sql) en de
// toelichting in beheer-nav-items.ts over waarom "Vereniging" grotendeels
// geen adminOnly is.
export async function updateOrgProfileAction(
  _prevState: UpdateOrgProfileState,
  formData: FormData
): Promise<UpdateOrgProfileState> {
  const profile = await requireBoard();
  const supabase = await createClient();

  const introText = String(formData.get("intro_text") ?? "").trim();
  const missionText = String(formData.get("mission_text") ?? "").trim();
  const visionText = String(formData.get("vision_text") ?? "").trim();

  const { error } = await supabase
    .from("org_profile")
    .update({
      intro_text: introText || null,
      mission_text: missionText || null,
      vision_text: visionText || null,
      updated_by: profile.id,
    })
    .eq("id", true);

  if (error) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  await logAuditAction("org_profile_updated", "org_profile", "org_profile");

  revalidatePath("/beheer/vereniging");
  revalidatePath("/vereniging/over-ons");
  return { success: true };
}

export type UploadOrgHeaderImageState = { error?: string; imagePath?: string };

// Zelfde news-images-bucket als nieuwsartikelen — die bucket-policy's
// checken alleen is_board(), geen specifiek pad, dus geen nieuwe bucket
// nodig voor deze aparte map erin (zie 0109_org_profile_header_image.sql).
export async function uploadOrgHeaderImageAction(
  _prevState: UploadOrgHeaderImageState,
  formData: FormData
): Promise<UploadOrgHeaderImageState> {
  await requireBoard();
  const supabase = await createClient();

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Kies een afbeelding." };
  }

  const { data: existing } = await supabase.from("org_profile").select("header_image_path").eq("id", true).maybeSingle();

  const result = await uploadImage(supabase, "news-images", "org-profile", file);
  if ("error" in result) {
    return { error: result.error };
  }

  const { error } = await supabase.from("org_profile").update({ header_image_path: result.path }).eq("id", true);
  if (error) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  await removePreviousImage(supabase, "news-images", existing?.header_image_path ?? null);
  await logAuditAction("org_profile_header_image_updated", "org_profile", "org_profile");

  revalidatePath("/beheer/vereniging");
  revalidatePath("/vereniging/over-ons");
  return { imagePath: result.path };
}

export async function removeOrgHeaderImageAction(): Promise<void> {
  await requireBoard();
  const supabase = await createClient();

  const { data: existing } = await supabase.from("org_profile").select("header_image_path").eq("id", true).maybeSingle();
  await supabase.from("org_profile").update({ header_image_path: null }).eq("id", true);
  await removePreviousImage(supabase, "news-images", existing?.header_image_path ?? null);

  revalidatePath("/beheer/vereniging");
  revalidatePath("/vereniging/over-ons");
}
