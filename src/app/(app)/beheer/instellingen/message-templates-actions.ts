"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isEmailConfigured, sendRawHtmlEmail } from "@/lib/email/send";
import { renderGeneralSignature, renderPersonalSignature } from "@/lib/templates/signature";
import { getAppSettings } from "@/lib/settings/app-settings";
import { variablesForMessageTemplate } from "@/lib/templates/message-template-variables";
import { MESSAGE_TEMPLATE_DEFAULTS } from "@/lib/templates/message-template-defaults";

export type UpdateMessageTemplateState = { error?: string; success?: boolean };

export async function updateMessageTemplateAction(
  key: string,
  _prevState: UpdateMessageTemplateState,
  formData: FormData
): Promise<UpdateMessageTemplateState> {
  const profile = await requireAdmin();

  const subject = String(formData.get("subject") ?? "").trim();
  const bodyHtml = String(formData.get("body_html") ?? "").trim();
  const ctaLabel = String(formData.get("cta_label") ?? "").trim();
  const afterHtml = String(formData.get("after_html") ?? "").trim();
  const signatureType = String(formData.get("signature_type") ?? "alg");
  const pushTitle = formData.get("push_title");
  const pushBody = formData.get("push_body");

  if (!subject || !bodyHtml || !ctaLabel) {
    return { error: "Onderwerp, inhoud en knoptekst zijn verplicht." };
  }
  if (signatureType !== "alg" && signatureType !== "pers") {
    return { error: "Ongeldige handtekeningkeuze." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("message_templates")
    .update({
      subject,
      body_html: bodyHtml,
      cta_label: ctaLabel,
      after_html: afterHtml,
      signature_type: signatureType,
      push_title: pushTitle !== null ? String(pushTitle).trim() || null : undefined,
      push_body: pushBody !== null ? String(pushBody).trim() || null : undefined,
      updated_by: profile.id,
    })
    .eq("key", key);

  if (error) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath("/beheer/instellingen");
  return { success: true };
}

export type ResetMessageTemplateState = { error?: string; success?: boolean };

// "Standaardtekst terugzetten" — leest terug uit de vaste, in de code
// meegeleverde standaardwaarden (zelfde tekst als de seed in migratie 0129),
// niet uit een losse "oorspronkelijke versie"-kolom in de database.
export async function resetMessageTemplateAction(key: string): Promise<ResetMessageTemplateState> {
  const profile = await requireAdmin();
  const defaults = MESSAGE_TEMPLATE_DEFAULTS[key];
  if (!defaults) {
    return { error: "Geen standaardtekst bekend voor dit bericht." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("message_templates")
    .update({
      subject: defaults.subject,
      body_html: defaults.bodyHtml,
      cta_label: defaults.ctaLabel,
      after_html: defaults.afterHtml,
      push_title: defaults.pushTitle,
      push_body: defaults.pushBody,
      updated_by: profile.id,
    })
    .eq("key", key);

  if (error) {
    return { error: "Terugzetten is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath("/beheer/instellingen");
  return { success: true };
}

export type SendTestMessageState = { error?: string; success?: boolean };

// Test-mail gebruikt de inhoud zoals die NU in het formulier staat (ook als
// die nog niet is opgeslagen) — dezelfde velden als het opslaan-formulier,
// alleen naar het eigen e-mailadres van de ingelogde beheerder i.p.v. naar
// de database.
export async function sendTestMessageEmailAction(
  key: string,
  _prevState: SendTestMessageState,
  formData: FormData
): Promise<SendTestMessageState> {
  const profile = await requireAdmin();

  if (!isEmailConfigured()) {
    return { error: "E-mail versturen is niet geconfigureerd." };
  }
  if (!profile.email) {
    return { error: "Je hebt zelf geen e-mailadres ingesteld." };
  }

  const subject = String(formData.get("subject") ?? "").trim();
  const bodyHtml = String(formData.get("body_html") ?? "").trim();
  const ctaLabel = String(formData.get("cta_label") ?? "").trim();
  const afterHtml = String(formData.get("after_html") ?? "").trim();
  const signatureType = String(formData.get("signature_type") ?? "alg") === "pers" ? "pers" : "alg";

  const variables = Object.fromEntries(variablesForMessageTemplate(key).map((v) => [v.key, v.example]));
  const settings = await getAppSettings();
  const { renderTemplate } = await import("@/lib/template/render");
  const { escapeHtml } = await import("@/lib/text/escape-html");
  const escapedVariables = Object.fromEntries(Object.entries(variables).map(([k, v]) => [k, escapeHtml(v)]));

  const ctaStyle =
    "display:inline-block;background:#e8000f;color:#fff;font-weight:700;padding:11px 20px;border-radius:8px;text-decoration:none;margin:4px 0 16px";
  const testLink = `${process.env.SITE_URL ?? ""}/`;
  const renderedSubject = renderTemplate(subject, variables);
  const renderedBody = renderTemplate(bodyHtml, escapedVariables);
  const renderedAfter = renderTemplate(afterHtml, escapedVariables);
  const cta = `<a href="${escapeHtml(testLink)}" style="${ctaStyle}">${escapeHtml(ctaLabel)}</a>`;
  const signatureHtml = signatureType === "pers" ? renderPersonalSignature(settings) : renderGeneralSignature(settings);
  const banner = `<p style="margin:0 0 16px;padding:10px 14px;background:#fff3cd;border-radius:8px;font-size:13px;color:#664d03;">Testmail - dit is een voorbeeld, niet daadwerkelijk verstuurd aan een lid.</p>`;
  const html = banner + renderedBody + cta + renderedAfter + `<div style="margin-top:22px">${signatureHtml}</div>`;

  const result = await sendRawHtmlEmail(profile.email, `[Test] ${renderedSubject}`, html);
  if (result.error) {
    return { error: result.error };
  }
  return { success: true };
}

export type UpdateSignatureSettingsState = { error?: string; success?: boolean };

export async function updateSignatureSettingsAction(
  _prevState: UpdateSignatureSettingsState,
  formData: FormData
): Promise<UpdateSignatureSettingsState> {
  const profile = await requireAdmin();

  const name = String(formData.get("signature_personal_name") ?? "").trim();
  const role = String(formData.get("signature_personal_role") ?? "").trim();
  const phone = String(formData.get("signature_personal_phone") ?? "").trim();
  const email = String(formData.get("signature_personal_email") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({
      signature_personal_name: name || null,
      signature_personal_role: role || null,
      signature_personal_phone: phone || null,
      signature_personal_email: email || null,
      updated_by: profile.id,
    })
    .eq("id", true);

  if (error) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath("/beheer/instellingen");
  return { success: true };
}

export type SendTestSignatureState = { error?: string; success?: boolean };

export async function sendTestSignatureEmailAction(): Promise<SendTestSignatureState> {
  const profile = await requireAdmin();
  if (!isEmailConfigured()) {
    return { error: "E-mail versturen is niet geconfigureerd." };
  }
  if (!profile.email) {
    return { error: "Je hebt zelf geen e-mailadres ingesteld." };
  }

  const settings = await getAppSettings();
  const html =
    `<p style="margin:0 0 16px;padding:10px 14px;background:#fff3cd;border-radius:8px;font-size:13px;color:#664d03;">Testmail - zo zien de twee handtekeningen eruit.</p>` +
    `<p><b>Algemeen</b></p><div>${renderGeneralSignature(settings)}</div>` +
    `<hr style="margin:24px 0;border:none;border-top:1px solid #e5e5ea;" />` +
    `<p><b>Persoonlijk</b></p><div>${renderPersonalSignature(settings)}</div>`;

  const result = await sendRawHtmlEmail(profile.email, "[Test] Handtekeningen", html);
  if (result.error) return { error: result.error };
  return { success: true };
}
