"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type ApplyToCommissionState = { error?: string; success?: boolean };

// UX-feedback: één gedeelde aanmeld-CTA i.p.v. een losse knop per
// commissie — die stuurt nu ook een optionele toelichting mee, die het
// bestuur bij de beoordeling in Beheer ziet (zie CommissiesAdminContent).
export async function applyToCommissionAction(
  commissionId: string,
  message: string
): Promise<ApplyToCommissionState> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: existingMembership } = await supabase
    .from("commission_memberships")
    .select("id")
    .eq("commission_id", commissionId)
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (existingMembership) {
    return { error: "Je bent al lid van deze commissie." };
  }

  const trimmedMessage = message.trim();
  const { error } = await supabase
    .from("commission_applications")
    .insert({ commission_id: commissionId, profile_id: profile.id, message: trimmedMessage || null });

  if (error) {
    // 23505 = unique index op (commission_id, profile_id) where status =
    // 'in_behandeling' — er loopt al een aanvraag, zie
    // 0107_vereniging_bestuur_commissies.sql.
    if (error.code === "23505") {
      return { error: "Je hebt al een openstaande aanvraag voor deze commissie." };
    }
    return { error: "Aanmelden is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath("/vereniging/commissies");
  return { success: true };
}
