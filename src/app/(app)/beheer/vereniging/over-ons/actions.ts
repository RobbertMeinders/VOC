"use server";

import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
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
