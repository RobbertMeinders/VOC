"use server";

import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isEmailConfigured, sendRawHtmlEmail, invitationGreeting } from "@/lib/email/send";
import { renderMessageEmail } from "@/lib/templates/message-render";
import { invalidateQuery } from "@/lib/cache/queryCache";
import type { UserRole } from "@/lib/types/database";

type InvitationSource = "nieuw_lid" | "bestaand_lid" | "collega";

function templateKeyForSource(source: InvitationSource): "uit-nieuw" | "uit-bestaand" | "uit-collega" {
  if (source === "bestaand_lid") return "uit-bestaand";
  if (source === "collega") return "uit-collega";
  return "uit-nieuw";
}

async function sendInvitationTemplateEmail(
  source: InvitationSource,
  to: string,
  token: string,
  firstName: string | null
): Promise<{ error?: string }> {
  if (!isEmailConfigured()) {
    return { error: "E-mail versturen is niet geconfigureerd." };
  }
  const link = `${process.env.SITE_URL ?? ""}/register/${token}`;
  const rendered = await renderMessageEmail(templateKeyForSource(source), link, { greeting: invitationGreeting(firstName) });
  if (!rendered) {
    return { error: "Sjabloon ontbreekt." };
  }
  return sendRawHtmlEmail(to, rendered.subject, rendered.html);
}

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
  const source: InvitationSource = formData.get("source") === "bestaand_lid" ? "bestaand_lid" : "nieuw_lid";

  if (role !== "lid" && profile.role !== "beheerder") {
    return { error: "Alleen een beheerder kan bestuursleden of beheerders uitnodigen." };
  }
  // Een e-mailloze uitnodigingslink is voor "lid" bewust ondersteund, maar
  // voor bestuur/beheerder zou zo'n gedeelde/gelekte link voor iedereen die
  // hem in handen krijgt een account met verhoogde rechten opleveren —
  // zelfde regel als de databaseconstraint invitations_board_requires_email.
  if (role !== "lid" && !email) {
    return { error: "Een uitnodiging voor bestuur of beheer vereist een e-mailadres." };
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
      source,
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

  const { error: emailError } = await sendInvitationTemplateEmail(source, email, invitation.token, firstName || null);
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

export async function revokeInvitationAction(id: string): Promise<{ error?: string }> {
  await requireBoard();
  const supabase = await createClient();
  // F12: zonder de status-guard kon dit een inmiddels geaccepteerde
  // uitnodiging (de uitgenodigde registreerde zich terwijl deze pagina nog
  // de oude, nog-pending lijst toonde) stilletjes op 'revoked' zetten —
  // het account bestaat dan al, maar de geschiedenis van de uitnodiging
  // zelf zou dat verkeerd laten zien. Zelfde guard als extendInvitationAction
  // hierboven.
  const { error, count } = await supabase
    .from("invitations")
    .update({ status: "revoked" }, { count: "exact" })
    .eq("id", id)
    .eq("status", "pending");
  // Foutenrapport §0, fix 4 (uitgebreid naar expiringInvitations): zonder
  // dit bleef de Beheer-badge tot 30s achterlopen op een zojuist
  // ingetrokken/verlengde uitnodiging.
  invalidateQuery("beheer-waiting-counts");
  revalidatePath("/beheer/instroom");
  if (error) {
    return { error: "Intrekken is niet gelukt. Probeer het opnieuw." };
  }
  if (!count) {
    return { error: "Deze uitnodiging is al gebruikt of al ingetrokken." };
  }
  return {};
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
  invalidateQuery("beheer-waiting-counts");
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
  invalidateQuery("beheer-waiting-counts");
  revalidatePath("/beheer/instroom");
}

export async function sendInvitationEmailAction(id: string): Promise<{ error?: string }> {
  await requireBoard();
  const supabase = await createClient();

  const { data: invitation } = await supabase
    .from("invitations")
    .select("token, email, status, first_name, source")
    .eq("id", id)
    .maybeSingle();

  if (!invitation || invitation.status !== "pending") {
    return { error: "Deze uitnodiging is niet (meer) geldig." };
  }
  if (!invitation.email) {
    return { error: "Deze uitnodiging heeft geen e-mailadres." };
  }

  const { error } = await sendInvitationTemplateEmail(invitation.source, invitation.email, invitation.token, invitation.first_name);
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
    .select("id, token, email, status, first_name, source")
    .in("id", ids)
    .eq("status", "pending");

  const withEmail = (invitations ?? []).filter((i): i is typeof i & { email: string } => Boolean(i.email));
  if (withEmail.length === 0) {
    return { succeeded: 0, failed: ids.length, error: "Geen van de geselecteerde uitnodigingen heeft een e-mailadres." };
  }

  let succeeded = 0;
  const sentIds: string[] = [];
  for (const invitation of withEmail) {
    const { error } = await sendInvitationTemplateEmail(invitation.source, invitation.email, invitation.token, invitation.first_name);
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
