"use server";

import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { sendTemplatedEmail } from "@/lib/email/send";
import { invalidateQuery } from "@/lib/cache/queryCache";
import type { UserRole } from "@/lib/types/database";

// UX-review punt 17: mirror van de bedrijf-opzoek/aanmaak-logica in
// createInvitationFromAccessRequestAction (beheer/aanvragen/actions.ts) —
// hier zonder adres/geocoding, want het handmatige uitnodigingsformulier
// vraagt die velden niet.
async function resolveCompanyIdFromForm(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData
): Promise<string | null> {
  const companyMode = String(formData.get("company_mode") ?? "");
  if (companyMode === "existing") {
    const companyId = String(formData.get("company_id") ?? "").trim();
    return companyId || null;
  }
  if (companyMode === "new") {
    const name = String(formData.get("new_company_name") ?? "").trim();
    if (!name) return null;
    const industry = String(formData.get("new_company_industry") ?? "").trim() || null;
    const city = String(formData.get("new_company_city") ?? "").trim() || null;
    const website = String(formData.get("new_company_website") ?? "").trim() || null;
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Math.random().toString(36).slice(2, 8)}`;
    const { data: createdCompany } = await supabase
      .from("companies")
      .insert({ name, slug, industry, city, website })
      .select("id")
      .single();
    if (createdCompany) {
      invalidateQuery("bedrijven-page-data");
      invalidateQuery("beheer-bedrijven-page-data");
      return createdCompany.id;
    }
  }
  return null;
}

const DEFAULT_VALIDITY_MS = 14 * 24 * 60 * 60 * 1000;

export type CreateInvitationState = { error?: string; success?: boolean; emailSent?: boolean; emailError?: string };

export async function createInvitationAction(
  _prevState: CreateInvitationState,
  formData: FormData
): Promise<CreateInvitationState> {
  const profile = await requireBoard();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "lid") as UserRole;
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();

  if (role !== "lid" && profile.role !== "beheerder") {
    return { error: "Alleen een beheerder kan bestuursleden of beheerders uitnodigen." };
  }

  const supabase = await createClient();
  const companyId = await resolveCompanyIdFromForm(supabase, formData);

  // Zonder e-mailadres is de link vanaf aanmaken al bruikbaar/deelbaar (geen
  // verzendmoment om op te wachten) — dan krijgt hij meteen een vervaldatum.
  // Mét e-mailadres blijft expires_at NULL ("nog niet verstuurd") totdat de
  // verzending hieronder echt slaagt.
  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      email: email || null,
      role,
      invited_by: profile.id,
      first_name: firstName || null,
      last_name: lastName || null,
      company_id: companyId,
      expires_at: email ? null : new Date(Date.now() + DEFAULT_VALIDITY_MS).toISOString(),
    })
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
    await supabase
      .from("invitations")
      .update({
        last_sent_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + DEFAULT_VALIDITY_MS).toISOString(),
      })
      .eq("token", invitation.token);
  }

  // De uitnodiging zelf is al aangemaakt en blijft via "kopieer link" bruikbaar,
  // ook als het versturen van de mail zelf mislukt (bijv. SMTP nog niet
  // geconfigureerd) — dat mag het aanmaken niet blokkeren.
  return { success: true, emailSent: !emailError, emailError: emailError };
}

export async function revokeInvitationAction(id: string) {
  await requireBoard();
  const supabase = await createClient();
  await supabase.from("invitations").update({ status: "revoked" }).eq("id", id);
  revalidatePath("/beheer/instroom");
}

const EXTENDED_VALIDITY_MS = DEFAULT_VALIDITY_MS;

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
    await supabase
      .from("invitations")
      .update({
        last_sent_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + DEFAULT_VALIDITY_MS).toISOString(),
      })
      .eq("id", id);
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
    await supabase
      .from("invitations")
      .update({
        last_sent_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + DEFAULT_VALIDITY_MS).toISOString(),
      })
      .in("id", sentIds);
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
