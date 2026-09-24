import "server-only";

import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { renderTemplate } from "@/lib/template/render";

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
  variables: Record<string, string>
): Promise<{ error?: string }> {
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
  const subject = renderTemplate(template.subject, variables);
  const html = renderTemplate(template.body_html, variables);

  try {
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) return { error: "Versturen van de e-mail is niet gelukt." };
  } catch {
    return { error: "Versturen van de e-mail is niet gelukt." };
  }

  return {};
}

// Kale e-mail rechtstreeks via Resend, zonder board-beheerde content —
// fallback voor notificatietypes zonder template (of wanneer het template
// nog niet geladen kon worden).
async function sendRawNotificationEmail(
  to: string,
  title: string,
  body: string | null,
  linkUrl: string
): Promise<{ error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    return { error: "E-mail versturen is niet geconfigureerd (RESEND_API_KEY / EMAIL_FROM ontbreken)." };
  }

  const linkHtml = linkUrl ? `<p><a href="${linkUrl}">Bekijk in het ledenportaal</a></p>` : "";
  const html = `<p>${body ?? ""}</p>${linkHtml}`;

  const resend = new Resend(apiKey);
  try {
    const { error } = await resend.emails.send({ from, to, subject: title, html });
    if (error) return { error: "Versturen van de e-mail is niet gelukt." };
  } catch {
    return { error: "Versturen van de e-mail is niet gelukt." };
  }

  return {};
}

/**
 * Verstuurt een notificatie (uit de notifications-tabel) als e-mail —
 * gebruikt door /api/cron/send-email-notifications. Rendert het
 * bijbehorende beheerbare template (email_templates, zie
 * NOTIFICATION_EMAIL_TEMPLATE_KEYS) als dat bestaat, anders een kale mail
 * met de rauwe titel/body — zodat notificatietypes zonder eigen template
 * (moderatie, de uitkomst van je eigen aanvraag/inzending, …) gewoon
 * blijven werken.
 */
export async function sendNotificationEmail(
  to: string,
  notification: { type: string; title: string; body: string | null; link: string | null }
): Promise<{ error?: string }> {
  const siteUrl = process.env.SITE_URL ?? "";
  const linkUrl = notification.link ? `${siteUrl}${notification.link}` : "";

  const templateKey = NOTIFICATION_EMAIL_TEMPLATE_KEYS[notification.type];
  if (templateKey) {
    const result = await sendTemplatedEmail(templateKey, to, {
      title: notification.title,
      body: notification.body ?? "",
      link: linkUrl,
    });
    if (!result.error) return result;
  }

  return sendRawNotificationEmail(to, notification.title, notification.body, linkUrl);
}
