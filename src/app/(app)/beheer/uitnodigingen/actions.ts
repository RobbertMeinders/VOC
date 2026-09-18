"use server";

import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database";

export type CreateInvitationState = { error?: string; success?: boolean };

export async function createInvitationAction(
  _prevState: CreateInvitationState,
  formData: FormData
): Promise<CreateInvitationState> {
  const profile = await requireBoard();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "lid") as UserRole;

  if (role !== "lid" && profile.role !== "beheerder") {
    return { error: "Alleen een beheerder kan bestuursleden of beheerders uitnodigen." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("invitations").insert({
    email: email || null,
    role,
    invited_by: profile.id,
  });

  if (error) {
    return { error: "Uitnodiging aanmaken is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath("/beheer/uitnodigingen");
  return { success: true };
}

export async function revokeInvitationAction(id: string) {
  await requireBoard();
  const supabase = await createClient();
  await supabase.from("invitations").update({ status: "revoked" }).eq("id", id);
  revalidatePath("/beheer/uitnodigingen");
}
