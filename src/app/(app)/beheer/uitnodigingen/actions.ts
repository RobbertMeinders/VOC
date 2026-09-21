"use server";

import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { sendTemplatedEmail } from "@/lib/email/send";
import type { UserRole } from "@/lib/types/database";

export type CreateInvitationState = { error?: string; success?: boolean; emailSent?: boolean; emailError?: string };

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
  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({ email: email || null, role, invited_by: profile.id })
    .select("token")
    .single();

  if (error || !invitation) {
    return { error: "Uitnodiging aanmaken is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath("/beheer/uitnodigingen");

  if (!email) {
    return { success: true };
  }

  const link = `${process.env.SITE_URL ?? ""}/register/${invitation.token}`;
  const { error: emailError } = await sendTemplatedEmail("uitnodiging", email, { link });

  // De uitnodiging zelf is al aangemaakt en blijft via "kopieer link" bruikbaar,
  // ook als het versturen van de mail zelf mislukt (bijv. Resend nog niet
  // geconfigureerd) — dat mag het aanmaken niet blokkeren.
  return { success: true, emailSent: !emailError, emailError: emailError };
}

export async function revokeInvitationAction(id: string) {
  await requireBoard();
  const supabase = await createClient();
  await supabase.from("invitations").update({ status: "revoked" }).eq("id", id);
  revalidatePath("/beheer/uitnodigingen");
}

export async function sendInvitationEmailAction(id: string): Promise<{ error?: string }> {
  await requireBoard();
  const supabase = await createClient();

  const { data: invitation } = await supabase
    .from("invitations")
    .select("token, email, status")
    .eq("id", id)
    .maybeSingle();

  if (!invitation || invitation.status !== "pending") {
    return { error: "Deze uitnodiging is niet (meer) geldig." };
  }
  if (!invitation.email) {
    return { error: "Deze uitnodiging heeft geen e-mailadres." };
  }

  const link = `${process.env.SITE_URL ?? ""}/register/${invitation.token}`;
  const { error } = await sendTemplatedEmail("uitnodiging", invitation.email, { link });
  return { error };
}
