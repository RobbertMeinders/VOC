import "server-only";

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { createClient } from "@/lib/supabase/server";
import { renderTemplate } from "@/lib/template/render";
import { escapeHtml } from "@/lib/text/escape-html";

export { escapeHtml };

// Verstuurt via de SMTP-mailbox van de eigen hosting (bijv. info@vocveendam.nl)
// i.p.v. een los account bij een externe e-maildienst (Resend e.d.) — geen
// extra accountje, geen aparte factuur, en geen limiet bovenop wat de hosting
// zelf al toestaat. Eén gecachete transporter per serverproces i.p.v. per
// verzending een nieuwe SMTP-verbinding opzetten.
let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (!host) return null;

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      // Poort 465 is impliciet TLS vanaf de eerste byte; elke andere poort
      // (587, 25, ...) start onversleuteld en schakelt zelf over via
      // STARTTLS — nodemailer regelt dat laatste automatisch zodra de server
      // het aanbiedt, dus secure moet hier alleen voor 465 aan.
      secure: port === 465,
      auth: user ? { user, pass: password } : undefined,
    });
  }
  return cachedTransporter;
}

// Wordt gebruikt door inlog-/wachtwoordschermen om mail-afhankelijke opties
// (magic link, wachtwoord-reset) tijdelijk te verbergen i.p.v. een valse
// "we hebben een mail gestuurd"-melding te tonen terwijl er geen SMTP-
// configuratie is (bv. nog geen bestuursakkoord op het portaal) — zie
// sendMail hieronder voor dezelfde check.
export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.EMAIL_FROM);
}

type SendResult = { error?: string; providerId?: string };

// Extra, expliciet slot bovenop SMTP_HOST/EMAIL_FROM: EMAIL_ALLOWLIST (kommagescheiden
// adressen) begrenst waar mail écht naartoe mag, ongeacht welke ontvanger een
// nieuwsbrief- of notificatieverzending oplevert. In productie ongezet =
// ongewijzigd gedrag (iedereen toegestaan); overal elders (preview, lokale
// ontwikkeling, tests) staat de begrenzing standaard aan, en zonder
// EMAIL_ALLOWLIST betekent dat: niemand toegestaan — zo kan een test- of
// previewomgeving nooit per ongeluk een lid of contact mailen.
function allowedRecipients(): Set<string> | null {
  const raw = process.env.EMAIL_ALLOWLIST;
  if (raw === undefined) {
    return process.env.NODE_ENV === "production" ? null : new Set();
  }
  return new Set(
    raw
      .split(",")
      .map((address) => address.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isRecipientAllowed(to: string): boolean {
  const allowlist = allowedRecipients();
  if (allowlist === null) return true;
  return allowlist.has(to.trim().toLowerCase());
}

async function sendMail(to: string, subject: string, html: string, from?: string, replyTo?: string): Promise<SendResult> {
  if (!isRecipientAllowed(to)) {
    return { error: "Overgeslagen: dit e-mailadres staat niet op de EMAIL_ALLOWLIST." };
  }

  const transporter = getTransporter();
  const defaultFrom = process.env.EMAIL_FROM;
  if (!transporter || !defaultFrom) {
    return { error: "E-mail versturen is niet geconfigureerd (SMTP_HOST / EMAIL_FROM ontbreken)." };
  }

  try {
    const info = await transporter.sendMail({ from: from ?? defaultFrom, to, subject, html, ...(replyTo ? { replyTo } : {}) });
    return { providerId: info.messageId };
  } catch {
    return { error: "Versturen van de e-mail is niet gelukt." };
  }
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
  activity_reminder: "activity_reminder",
  waitlist_promoted: "waitlist_promoted",
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
  return `<p style="margin-top:20px;padding-top:12px;border-top:1px solid #e5e5ea;font-size:12px;color:#6b6b72;">Je ontvangt dit als lid van de Veendammer Ondernemers Compagnie. <a href="${escapeHtml(`${siteUrl}/instellingen`)}" style="color:#6b6b72;">Voorkeuren aanpassen</a></p>`;
}

/**
 * Renders a board-editable template (see email_templates /
 * get_email_template()) and sends it via SMTP. Used both from
 * authenticated contexts (uitnodigingen) and anonymous ones (wachtwoord
 * vergeten) — the template is read through a security definer RPC so an
 * anonymous caller can still read the (non-secret) template content.
 */
export async function sendTemplatedEmail(
  templateKey: string,
  to: string,
  variables: Record<string, string>,
  options?: { includePreferencesFooter?: boolean }
): Promise<SendResult> {
  const supabase = await createClient();
  const { data: templates, error: templateError } = await supabase.rpc("get_email_template", {
    p_key: templateKey,
  });
  const template = templates?.[0];

  if (templateError || !template) {
    return { error: `E-mailtemplate '${templateKey}' kon niet worden geladen.` };
  }

  // Subject is platte tekst (geen HTML-rendering), dus ongewijzigde
  // variabelen; de HTML-body krijgt elke variabele HTML-geëscaped.
  const subject = renderTemplate(template.subject, variables);
  const escapedVariables = Object.fromEntries(Object.entries(variables).map(([key, value]) => [key, escapeHtml(value)]));
  const html = renderTemplate(template.body_html, escapedVariables) + (options?.includePreferencesFooter ? notificationPreferencesFooter() : "");

  return sendMail(to, subject, html);
}

// Kale e-mail zonder board-beheerde content — fallback voor
// notificatietypes zonder template (of wanneer het template nog niet
// geladen kon worden).
async function sendRawNotificationEmail(to: string, title: string, body: string | null, linkUrl: string): Promise<SendResult> {
  const linkHtml = linkUrl ? `<p><a href="${escapeHtml(linkUrl)}">Bekijk in het ledenportaal</a></p>` : "";
  const html = `<p>${escapeHtml(body ?? "")}</p>${linkHtml}${notificationPreferencesFooter()}`;
  return sendMail(to, title, html);
}

/**
 * Verstuurt losse, al-gerenderde HTML — gebruikt door de nieuwsbrief
 * (testmail én de definitieve verzending), die zijn eigen HTML bouwt via
 * renderNewsletterHtml() in plaats van via een {{var}}-template. senderName
 * overschrijft alleen de weergavenaam, niet het onderliggende, in SMTP_USER
 * geverifieerde afzenderadres uit EMAIL_FROM.
 */
export async function sendRawHtmlEmail(
  to: string,
  subject: string,
  html: string,
  senderName?: string | null,
  replyTo?: string
): Promise<SendResult> {
  const defaultFrom = process.env.EMAIL_FROM;
  if (!defaultFrom) return sendMail(to, subject, html, undefined, replyTo);

  const fromAddressMatch = defaultFrom.match(/<([^>]+)>/);
  const fromAddress = fromAddressMatch ? fromAddressMatch[1] : defaultFrom;
  const from = senderName ? `${senderName} <${fromAddress}>` : defaultFrom;

  return sendMail(to, subject, html, from, replyTo);
}

/**
 * VOC Hub — Veilige e-mailcontactfunctie: het "Neem contact op"-formulier op
 * een ledenprofiel. Verstuurt altijd vanaf het geverifieerde portaal-adres
 * (EMAIL_FROM, met de afzenders naam als weergavenaam — zelfde truc als
 * sendRawHtmlEmail hierboven) zodat de ontvanger niets geks in zijn
 * spamfilter ziet, maar Reply-To staat op het ECHTE e-mailadres van de
 * afzender: een rechtstreeks antwoord komt zo bij de afzender terecht,
 * zonder dat de ontvanger zelf iets hoeft op te zoeken. Het e-mailadres van
 * de ontvanger komt hier nergens de respons/logging van de aanroeper in —
 * die blijft binnen deze functie.
 */
export async function sendMemberContactEmail(params: {
  to: string;
  replyTo: string;
  senderName: string;
  subject: string;
  message: string;
}): Promise<SendResult> {
  const { to, replyTo, senderName, subject, message } = params;
  const html = `
    <p>${escapeHtml(senderName)} heeft je een bericht gestuurd via het ledenportaal.</p>
    <p style="white-space:pre-line;">${escapeHtml(message)}</p>
    <p style="margin-top:20px;padding-top:12px;border-top:1px solid #e5e5ea;font-size:12px;color:#6b6b72;">Je kunt rechtstreeks op deze e-mail reageren — je antwoord gaat naar ${escapeHtml(senderName)}, niet naar het ledenportaal.</p>
  `;
  return sendRawHtmlEmail(to, subject, html, senderName, replyTo);
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
): Promise<SendResult> {
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
