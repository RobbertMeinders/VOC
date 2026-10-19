"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadImage } from "@/lib/supabase/upload";
import { logAuditAction } from "@/lib/audit/log";

export type UpdateAppSettingsState = { error?: string; success?: boolean };

export async function updateAppSettingsAction(
  _prevState: UpdateAppSettingsState,
  formData: FormData
): Promise<UpdateAppSettingsState> {
  const profile = await requireAdmin();

  const siteName = String(formData.get("site_name") ?? "").trim();
  const orgName = String(formData.get("org_name") ?? "").trim();
  const privacyContent = String(formData.get("privacy_content") ?? "").trim();

  if (!siteName || !orgName) {
    return { error: "Naam van het ledenportaal en van de vereniging zijn verplicht." };
  }
  if (!privacyContent) {
    return { error: "De inhoud van Privacy & veiligheid mag niet leeg zijn." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({ site_name: siteName, org_name: orgName, privacy_content: privacyContent, updated_by: profile.id })
    .eq("id", true);

  if (error) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/privacy");
  return { success: true };
}

export type UploadAppLogoState = { error?: string; logoUrl?: string };

// Upload + opslaan in één stap (i.p.v. eerst uploaden en dan nog een los
// "Opslaan" nodig hebben, zoals bij een e-mailtemplate-afbeelding) — een
// logo is geen stuk tekst dat je nog ergens hoeft te plakken, het hoort
// meteen te gelden. email-assets is bewust dezelfde publieke bucket als de
// nieuwsbrief-afbeeldingen: een logo moet ook zonder sessie leesbaar zijn
// (in-app sidebar, e-mails).
export async function uploadAppLogoAction(_prevState: UploadAppLogoState, formData: FormData): Promise<UploadAppLogoState> {
  const profile = await requireAdmin();

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Kies een afbeelding." };
  }

  const supabase = await createClient();
  const result = await uploadImage(supabase, "email-assets", "branding", file);
  if ("error" in result) {
    return { error: result.error };
  }

  const { data } = supabase.storage.from("email-assets").getPublicUrl(result.path);

  const { error } = await supabase
    .from("app_settings")
    .update({ logo_url: data.publicUrl, updated_by: profile.id })
    .eq("id", true);
  if (error) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath("/", "layout");
  return { logoUrl: data.publicUrl };
}

export async function removeAppLogoAction(): Promise<void> {
  const profile = await requireAdmin();
  const supabase = await createClient();

  await supabase.from("app_settings").update({ logo_url: null, updated_by: profile.id }).eq("id", true);

  revalidatePath("/", "layout");
}

export type ForceLogoutAllState = { error?: string; success?: boolean };

// Nucleaire optie: iedereen tegelijk uitloggen (bv. bij een vermoede
// gelekte sessie, of na een beveiligingsincident) — alleen beheerder, en
// alleen met expliciete bevestiging in de UI (ForceLogoutAllButton). Sluit
// de eigen sessie van de aanroepende beheerder uit (force_logout_all_members,
// 0111), anders zou die zichzelf er ook meteen uitgooien.
export async function forceLogoutAllMembersAction(): Promise<ForceLogoutAllState> {
  const profile = await requireAdmin();

  const admin = createAdminClient();
  const { error } = await admin.rpc("force_logout_all_members", { p_except_id: profile.id });
  if (error) {
    return { error: "Uitloggen is niet gelukt. Probeer het opnieuw." };
  }

  await logAuditAction("all_members_force_logged_out");
  return { success: true };
}
