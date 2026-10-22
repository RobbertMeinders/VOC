import "server-only";

import { escapeHtml } from "@/lib/text/escape-html";
import type { AppSettings } from "@/lib/settings/app-settings";

// Algemene handtekening: logo + organisatienaam komen uit app_settings,
// contactadres/website uit EMAIL_FROM/SITE_URL — dezelfde bron als de mail
// zelf al gebruikt (zie sendMail/sendRawHtmlEmail in lib/email/send.ts),
// zodat dit nooit los van de echte verzendconfiguratie kan raken en er geen
// apart in te vullen veld voor nodig is.
function generalContactEmail(): string {
  const from = process.env.EMAIL_FROM ?? "";
  const match = from.match(/<([^>]+)>/);
  return match ? match[1] : from;
}

function generalWebsite(): { href: string; label: string } | null {
  const site = (process.env.SITE_URL ?? "").trim();
  if (!site) return null;
  const href = site.startsWith("http") ? site : `https://${site}`;
  const label = site.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return label ? { href, label } : null;
}

function logoImg(logoUrl: string | null): string {
  if (!logoUrl) return "";
  // width als los HTML-attribuut, niet alleen CSS: sommige mailclients
  // (o.a. Outlook) negeren CSS-breedtes op <img> zodra de afbeelding laadt
  // en vallen dan terug op de werkelijke pixelgrootte -- zelfde fix als
  // eerder al nodig was voor de nieuwsbrief-afbeeldingen (newsletter/render.ts).
  return `<img src="${escapeHtml(logoUrl)}" alt="Logo" width="84" style="width:84px;height:auto;margin:8px 0 6px;display:block" />`;
}

export function renderGeneralSignature(settings: AppSettings): string {
  const email = generalContactEmail();
  const website = generalWebsite();
  const contactParts = [
    email ? `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>` : "",
    website ? `<a href="${escapeHtml(website.href)}">${escapeHtml(website.label)}</a>` : "",
  ].filter(Boolean);

  return [
    `<div>Met vriendelijke groet,</div>`,
    logoImg(settings.logo_url),
    `<div>${escapeHtml(settings.org_name)}</div>`,
    contactParts.length > 0 ? `<div>${contactParts.join(" | ")}</div>` : "",
  ]
    .filter(Boolean)
    .join("");
}

// Zonder ingevulde persoonlijke gegevens (nog niemand heeft de velden in
// Automatische berichten -> Handtekeningen ingevuld) valt dit terug op de
// algemene handtekening — nooit een kale/halve handtekening onder een mail.
export function renderPersonalSignature(settings: AppSettings): string {
  if (!settings.signature_personal_name) return renderGeneralSignature(settings);

  const nameRole = [
    `<b>${escapeHtml(settings.signature_personal_name)}</b>`,
    settings.signature_personal_role ? `<br>${escapeHtml(settings.signature_personal_role)}` : "",
  ].join("");
  const contactParts = [
    settings.signature_personal_phone ? escapeHtml(settings.signature_personal_phone) : "",
    settings.signature_personal_email
      ? `<a href="mailto:${escapeHtml(settings.signature_personal_email)}">${escapeHtml(settings.signature_personal_email)}</a>`
      : "",
  ].filter(Boolean);

  return [
    `<div>Met vriendelijke groet,</div>`,
    `<div style="margin-top:8px">${nameRole}</div>`,
    logoImg(settings.logo_url),
    `<div>${escapeHtml(settings.org_name)}</div>`,
    contactParts.length > 0 ? `<div>${contactParts.join(" | ")}</div>` : "",
  ]
    .filter(Boolean)
    .join("");
}

export function renderSignature(type: "alg" | "pers", settings: AppSettings): string {
  return type === "pers" ? renderPersonalSignature(settings) : renderGeneralSignature(settings);
}
