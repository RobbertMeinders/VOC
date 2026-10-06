import "server-only";

import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { renderTemplate } from "@/lib/template/render";
import { escapeHtml } from "@/lib/text/escape-html";

export { escapeHtml };

// Wordt gebruikt door inlog-/wachtwoordschermen om mail-afhankelijke opties
// (magic link, wachtwoord-reset) tijdelijk te verbergen i.p.v. een valse
// "we hebben een mail gestuurd"-melding te tonen terwijl er geen Resend-key
// is (bv. nog geen bestuursakkoord op het portaal) — zie sendTemplatedEmail
// hieronder voor dezelfde check.
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

// Notificatietypes met een beheerbaar email_templates-record (0039_
// notification_templates.sql) — de overige types (moderatie, de uitkomst
// van je eigen aanvraag/inzending, …) hebben geen template en gaan altijd
// als kale mail (zie sendRawNotificationEmail hieronder).
const NOTIFICATION_EMAIL_TEMPLATE_KEYS: Record<string, string> = {
  new_activity: "nieuwe_activiteit",
  new_member: "nieuw_lid",
  feed_comment: "feed_reactie",
  feed_mention: "feed_vermelding",
};

// Zelfde bewoording/stijl als de campagne-voettekst (render.ts) — een
// notificatiemail is optioneel (per type aan/uit te zetten op /instellingen,
// zie NOTIFICATION_EMAIL_TEMPLATE_KEYS/sendRawNotificationEmail hieronder),
// dus krijgt ook hier een duidelijke reden + voorkeurenlink. Puur
// transactionele mails (inloglink, uitnodiging, wachtwoord-reset) roepen
// sendTemplatedEmail aan zonder deze optie — daar valt niets "aan te
// passen", dat zou alleen verwarren.
function notificationPreferencesFooter(): string {
  const siteUrl = (process.env.SITE_URL ?? "").replace(/\/$/, "");
  return `<p style="margin-top:20px;padding-top:12px;border-top:1px solid #e5e5ea;font-size:12px;color:#6b6b72;">Je ontvangt dit als lid van VOC. <a href="${escapeHtml(`${siteUrl}/instellingen`)}" style="color:#6b6b72;">Voorkeuren aanpassen</a></p>`;
}

/**
 * Renders a board-editable template (see email_templates /
 * get_email_template()) and sends it via Resend. Used both from
 * authenticated contexts (uitnodigingen) and anonymous ones (wachtwoord
 * vergeten) — the template is read through a security definer RPC so an
 * anonymous caller can still read the (non-secret) template content.
 */
export async function sendTemplatedEmail(
  templateKey: string,
  to: string,
  variables: Record<string, string>,
  options?: { includePreferencesFooter?: boolean }
): Promise<{ error?: string; providerId?: string }> {
  const supabase = await createClient();
  const { data: templates, error: templateError } = await supabase.rpc("get_email_template", {
    p_key: templateKey,
  });
  const template = templates?.[0];

  if (templateError || !template) {
    return { error: `E-mailtemplate '${templateKey}' kon niet worden geladen.` };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    return { error: "E-mail versturen is niet geconfigureerd (RESEND_API_KEY / EMAIL_FROM ontbreken)." };
  }

  const resend = new Resend(apiKey);
  // Subject is platte tekst (geen HTML-rendering), dus ongewijzigde
  // variabelen; de HTML-body krijgt elke variabele HTML-geëscaped.
  const subject = renderTemplate(template.subject, variables);
  const escapedVariables = Object.fromEntries(Object.entries(variables).map(([key, value]) => [key, escapeHtml(value)]));
  const html = renderTemplate(template.body_html, escapedVariables) + (options?.includePreferencesFooter ? notificationPreferencesFooter() : "");

  try {
    const { data, error } = await resend.emails.send({ from, to, subject, html });
    if (error) return { error: "Versturen van de e-mail is niet gelukt." };
    return { providerId: data?.id };
  } catch {
    return { error: "Versturen van de e-mail is niet gelukt." };
  }
}

// Kale e-mail rechtstreeks via Resend, zonder board-beheerde content —
// fallback voor notificatietypes zonder template (of wanneer het template
// nog niet geladen kon worden).
async function sendRawNotificationEmail(
  to: string,
  title: string,
  body: string | null,
  linkUrl: string
): Promise<{ error?: string; providerId?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    return { error: "E-mail versturen is niet geconfigureerd (RESEND_API_KEY / EMAIL_FROM ontbreken)." };
  }

  const linkHtml = linkUrl ? `<p><a href="${escapeHtml(linkUrl)}">Bekijk in het ledenportaal</a></p>` : "";
  const html = `<p>${escapeHtml(body ?? "")}</p>${linkHtml}${notificationPreferencesFooter()}`;

  const resend = new Resend(apiKey);
  try {
    const { data, error } = await resend.emails.send({ from, to, subject: title, html });
    if (error) return { error: "Versturen van de e-mail is niet gelukt." };
    return { providerId: data?.id };
  } catch {
    return { error: "Versturen van de e-mail is niet gelukt." };
  }
}

/**
 * Verstuurt losse, al-gerenderde HTML rechtstreeks via Resend — gebruikt
 * door de nieuwsbrief (testmail én, later, de definitieve verzending), die
 * zijn eigen HTML bouwt via renderNewsletterHtml() in plaats van via een
 * {{var}}-template. senderName overschrijft alleen de weergavenaam, niet
 * het onderliggende, geverifieerde afzenderadres uit EMAIL_FROM.
 */
export async function sendRawHtmlEmail(
  to: string,
  subject: string,
  html: string,
  senderName?: string | null
): Promise<{ error?: string; providerId?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const defaultFrom = process.env.EMAIL_FROM;
  if (!apiKey || !defaultFrom) {
    return { error: "E-mail versturen is niet geconfigureerd (RESEND_API_KEY / EMAIL_FROM ontbreken)." };
  }

  const fromAddressMatch = defaultFrom.match(/<([^>]+)>/);
  const fromAddress = fromAddressMatch ? fromAddressMatch[1] : defaultFrom;
  const from = senderName ? `${senderName} <${fromAddress}>` : defaultFrom;

  const resend = new Resend(apiKey);
  try {
    const { data, error } = await resend.emails.send({ from, to, subject, html });
    if (error) return { error: "Versturen van de e-mail is niet gelukt." };
    return { providerId: data?.id };
  } catch {
    return { error: "Versturen van de e-mail is niet gelukt." };
  }
}

/**
 * Verstuurt een notificatie (uit de notifications-tabel) als e-mail —
 * gebruikt door /api/cron/send-email-notifications. Rendert het
 * bijbehorende beheerbare template (email_templates, zie
 * NOTIFICATION_EMAIL_TEMPLATE_KEYS) als dat bestaat, anders een kale mail
 * met de rauwe titel/body — zodat notificatietypes zonder eigen template
 * (moderatie, de uitkomst van je eigen aanvraag/inzending, …) gewoon
 * blijven werken. De geretourneerde providerId (Resend's eigen send-id)
 * wordt door de cron opgeslagen op de notificatie-rij, zodat een latere
 * open-webhook (Fase F, /api/webhooks/resend) 'm aan de juiste rij kan
 * koppelen.
 */
export async function sendNotificationEmail(
  to: string,
  notification: { type: string; title: string; body: string | null; link: string | null }
): Promise<{ error?: string; providerId?: string }> {
  const siteUrl = process.env.SITE_URL ?? "";
  const linkUrl = notification.link ? `${siteUrl}${notification.link}` : "";

  const templateKey = NOTIFICATION_EMAIL_TEMPLATE_KEYS[notification.type];
  if (templateKey) {
    const result = await sendTemplatedEmail(
      templateKey,
      to,
      {
        title: notification.title,
        body: notification.body ?? "",
        link: linkUrl,
      },
      { includePreferencesFooter: true }
    );
    if (!result.error) return result;
  }

  return sendRawNotificationEmail(to, notification.title, notification.body, linkUrl);
}
