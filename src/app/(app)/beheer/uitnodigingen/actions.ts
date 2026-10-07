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

  revalidatePath("/beheer/instroom");

  if (!email) {
    return { success: true };
  }

  const link = `${process.env.SITE_URL ?? ""}/register/${invitation.token}`;
  const { error: emailError } = await sendTemplatedEmail("uitnodiging", email, { link });
  if (!emailError) {
    await supabase.from("invitations").update({ last_sent_at: new Date().toISOString() }).eq("token", invitation.token);
  }

  // De uitnodiging zelf is al aangemaakt en blijft via "kopieer link" bruikbaar,
  // ook als het versturen van de mail zelf mislukt (bijv. Resend nog niet
  // geconfigureerd) — dat mag het aanmaken niet blokkeren.
  return { success: true, emailSent: !emailError, emailError: emailError };
}

export async function revokeInvitationAction(id: string) {
  await requireBoard();
  const supabase = await createClient();
  await supabase.from("invitations").update({ status: "revoked" }).eq("id", id);
  revalidatePath("/beheer/instroom");
}

const EXTENDED_VALIDITY_MS = 14 * 24 * 60 * 60 * 1000;

export async function extendInvitationAction(id: string) {
  await requireBoard();
  const supabase = await createClient();
  await supabase
    .from("invitations")
    .update({ expires_at: new Date(Date.now() + EXTENDED_VALIDITY_MS).toISOString() })
    .eq("id", id)
    .eq("status", "pending");
  revalidatePath("/beheer/instroom");
}

// Voor bulk-geïmporteerde uitnodigingen (leden-import) die nog niet verstuurd
// zijn tegen de tijd dat het portaal live gaat — scheelt elke uitnodiging
// los aanklikken.
export async function extendAllInvitationsAction() {
  await requireBoard();
  const supabase = await createClient();
  await supabase
    .from("invitations")
    .update({ expires_at: new Date(Date.now() + EXTENDED_VALIDITY_MS).toISOString() })
    .eq("status", "pending");
  revalidatePath("/beheer/instroom");
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
  if (!error) {
    await supabase.from("invitations").update({ last_sent_at: new Date().toISOString() }).eq("id", id);
    revalidatePath("/beheer/instroom");
  }
  return { error };
}

export type BulkActionResult = { succeeded: number; failed: number; error?: string };

// Bulk-tegenhangers van de losse rij-acties hierboven (zie B2 uit de
// UX-review: 137 uitnodigingen één voor één aanklikken is onwerkbaar) —
// opereren op een door het bestuur geselecteerde subset i.p.v. "alle
// openstaande" zoals de bestaande "Verleng alle"-knop.
export async function bulkSendInvitationEmailsAction(ids: string[]): Promise<BulkActionResult> {
  await requireBoard();
  const supabase = await createClient();

  const { data: invitations } = await supabase
    .from("invitations")
    .select("id, token, email, status")
    .in("id", ids)
    .eq("status", "pending");

  const withEmail = (invitations ?? []).filter((i): i is typeof i & { email: string } => Boolean(i.email));
  if (withEmail.length === 0) {
    return { succeeded: 0, failed: ids.length, error: "Geen van de geselecteerde uitnodigingen heeft een e-mailadres." };
  }

  let succeeded = 0;
  const sentIds: string[] = [];
  for (const invitation of withEmail) {
    const link = `${process.env.SITE_URL ?? ""}/register/${invitation.token}`;
    const { error } = await sendTemplatedEmail("uitnodiging", invitation.email, { link });
    if (!error) {
      succeeded += 1;
      sentIds.push(invitation.id);
    }
  }

  if (sentIds.length > 0) {
    await supabase.from("invitations").update({ last_sent_at: new Date().toISOString() }).in("id", sentIds);
  }

  revalidatePath("/beheer/instroom");
  return { succeeded, failed: ids.length - succeeded };
}

export async function bulkExtendInvitationsAction(ids: string[]): Promise<BulkActionResult> {
  await requireBoard();
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("invitations")
    .update({ expires_at: new Date(Date.now() + EXTENDED_VALIDITY_MS).toISOString() }, { count: "exact" })
    .in("id", ids)
    .eq("status", "pending");

  revalidatePath("/beheer/instroom");
  if (error) return { succeeded: 0, failed: ids.length, error: "Verlengen is niet gelukt." };
  return { succeeded: count ?? ids.length, failed: ids.length - (count ?? ids.length) };
}

export async function bulkRevokeInvitationsAction(ids: string[]): Promise<BulkActionResult> {
  await requireBoard();
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("invitations")
    .update({ status: "revoked" }, { count: "exact" })
    .in("id", ids);

  revalidatePath("/beheer/instroom");
  if (error) return { succeeded: 0, failed: ids.length, error: "Intrekken is niet gelukt." };
  return { succeeded: count ?? ids.length, failed: ids.length - (count ?? ids.length) };
}
