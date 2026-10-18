"use server";

import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { logAuditAction } from "@/lib/audit/log";

function revalidateCommissions() {
  revalidatePath("/beheer/vereniging/commissies");
  revalidatePath("/vereniging/commissies");
}

export type CreateCommissionState = { error?: string; success?: boolean };

export async function createCommissionAction(
  _prevState: CreateCommissionState,
  formData: FormData
): Promise<CreateCommissionState> {
  const profile = await requireBoard();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Naam is verplicht." };
  }
  const description = String(formData.get("description") ?? "").trim();

  const { error } = await supabase
    .from("commissions")
    .insert({ name, description: description || null, created_by: profile.id });

  if (error) {
    return { error: "Aanmaken is niet gelukt. Probeer het opnieuw." };
  }

  await logAuditAction("commission_created", "commission", undefined, { name });
  revalidateCommissions();
  return { success: true };
}

export type UpdateCommissionState = { error?: string; success?: boolean };

export async function updateCommissionAction(
  commissionId: string,
  _prevState: UpdateCommissionState,
  formData: FormData
): Promise<UpdateCommissionState> {
  await requireBoard();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Naam is verplicht." };
  }
  const description = String(formData.get("description") ?? "").trim();

  const { error } = await supabase
    .from("commissions")
    .update({ name, description: description || null })
    .eq("id", commissionId);

  if (error) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  await logAuditAction("commission_updated", "commission", commissionId);
  revalidateCommissions();
  return { success: true };
}

export async function archiveCommissionAction(commissionId: string): Promise<void> {
  await requireBoard();
  const supabase = await createClient();
  await supabase.from("commissions").update({ archived_at: new Date().toISOString() }).eq("id", commissionId);
  await logAuditAction("commission_archived", "commission", commissionId);
  revalidateCommissions();
}

export async function unarchiveCommissionAction(commissionId: string): Promise<void> {
  await requireBoard();
  const supabase = await createClient();
  await supabase.from("commissions").update({ archived_at: null }).eq("id", commissionId);
  await logAuditAction("commission_unarchived", "commission", commissionId);
  revalidateCommissions();
}

// Alleen bedoeld voor een gearchiveerde commissie (UI toont deze knop ook
// alleen dan) — cascade raakt uitsluitend commission_memberships/
// commission_applications, nooit profiles/accounts zelf.
export async function deleteCommissionAction(commissionId: string): Promise<void> {
  await requireBoard();
  const supabase = await createClient();
  const { error } = await supabase.from("commissions").delete().eq("id", commissionId);
  if (error) {
    throw new Error("Verwijderen is niet gelukt.");
  }
  await logAuditAction("commission_deleted", "commission", commissionId);
  revalidateCommissions();
}

export type AddCommissionMemberState = { error?: string; success?: boolean };

export async function addCommissionMemberAction(
  commissionId: string,
  _prevState: AddCommissionMemberState,
  formData: FormData
): Promise<AddCommissionMemberState> {
  const viewer = await requireBoard();
  const supabase = await createClient();

  const profileId = String(formData.get("profile_id") ?? "").trim();
  if (!profileId) {
    return { error: "Kies een lid." };
  }

  const { error } = await supabase
    .from("commission_memberships")
    .insert({ commission_id: commissionId, profile_id: profileId, created_by: viewer.id });

  if (error) {
    // Unique-constraint conflict (al lid) is geen echte fout voor de
    // gebruiker — gewoon negeren i.p.v. een foutmelding tonen voor iets dat
    // feitelijk al klopt.
    if (error.code !== "23505") {
      return { error: "Toevoegen is niet gelukt. Probeer het opnieuw." };
    }
  } else {
    await logAuditAction("commission_member_added", "commission", commissionId, { profile_id: profileId });
  }

  revalidateCommissions();
  return { success: true };
}

export async function removeCommissionMemberAction(commissionId: string, profileId: string): Promise<void> {
  await requireBoard();
  const supabase = await createClient();
  await supabase
    .from("commission_memberships")
    .delete()
    .eq("commission_id", commissionId)
    .eq("profile_id", profileId);
  await logAuditAction("commission_member_removed", "commission", commissionId, { profile_id: profileId });
  revalidateCommissions();
}

export async function decideCommissionApplicationAction(applicationId: string, approve: boolean): Promise<void> {
  const viewer = await requireBoard();
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("commission_applications")
    .select("id, commission_id, profile_id, status")
    .eq("id", applicationId)
    .maybeSingle();

  if (!application || application.status !== "in_behandeling") return;

  await supabase
    .from("commission_applications")
    .update({ status: approve ? "goedgekeurd" : "afgewezen", decided_by: viewer.id, decided_at: new Date().toISOString() })
    .eq("id", applicationId);

  if (approve) {
    const { error } = await supabase.from("commission_memberships").insert({
      commission_id: application.commission_id,
      profile_id: application.profile_id,
      created_by: viewer.id,
    });
    // 23505 = al lid (bv. dubbel goedgekeurd door twee bestuursleden
    // tegelijk) — geen probleem, de aanvraag staat dan al op "goedgekeurd".
    if (error && error.code !== "23505") {
      return;
    }
  }

  await logAuditAction(approve ? "commission_application_approved" : "commission_application_rejected", "commission", application.commission_id, {
    profile_id: application.profile_id,
  });

  revalidateCommissions();
  revalidatePath("/beheer");
}
