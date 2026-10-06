import { escapeHtml } from "@/lib/text/escape-html";
import { formatActivityDate } from "@/lib/format/date";
import type { NewsletterAlign, NewsletterBlock } from "./types";

// Bewust geen "server-only" hier: dezelfde functie rendert zowel de
// definitieve verzending (server) als de live preview in de beheereditor
// (client), zodat die twee nooit kunnen uiteenlopen.

// Hardcoded i.p.v. de CSS-variabelen uit globals.css — e-mailclients lezen
// geen CSS-variabelen, en een nieuwsbrief wordt altijd in het lichte thema
// getoond (zelfde keuze als de bestaande e-mailtemplate-preview en de
// publieke embed-pagina's: consistent voor elke ontvanger, ongeacht hun
// systeeminstelling).
const COLORS = {
  background: "#f7f7f8",
  surface: "#ffffff",
  foreground: "#17171a",
  muted: "#6b6b72",
  border: "#e5e5ea",
  red: "#e8000f",
  // Alle knoppen in de nieuwsbrief (intern én extern) — een rode knop bleek
  // eerder af te schrikken, en het intern/extern-onderscheid in kleur werd
  // door het bestuur zelf niet belangrijk genoeg bevonden om het bijbehorende
  // keuzeveld in de editor voor te laten bestaan. Rood blijft wel de
  // huisstijlkleur voor de rest van de app.
  green: "#2e7d32",
};

const FONT = "-apple-system, 'Segoe UI', Arial, sans-serif";

// Gematigd afgerond i.p.v. een volledige "pil" (voorheen 999px) — blijft
// een herkenbare knop zonder radicaal af te wijken van de rechthoekige
// knoppen in de bestaande VOC-mails.
const BUTTON_RADIUS = "8px";

function nl2br(text: string): string {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

// Bewust geen vrije HTML-invoer (geen contentEditable/rich-text-editor) —
// alleen **vet** en *cursief* per woord/zin, op dezelfde escaped tekst als
// nl2br. De bold-regex loopt eerst zodat de buitenste **-paren nooit per
// ongeluk als twee losse *cursief*-markeringen worden gelezen.
function formatInlineText(text: string): string {
  return nl2br(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function alignStyle(align: NewsletterAlign | undefined): string {
  return `text-align:${align ?? "left"};`;
}

function renderTextBlock(block: Extract<NewsletterBlock, { type: "text" }>): string {
  const align = alignStyle(block.align);
  return `<tr><td style="padding:0 24px 24px;${align}">
    ${block.title ? `<h2 style="margin:0 0 8px;font-size:20px;line-height:1.3;color:${COLORS.foreground};font-family:${FONT};${align}">${escapeHtml(block.title)}</h2>` : ""}
    <p style="margin:0;font-size:14px;line-height:1.6;color:${COLORS.foreground};font-family:${FONT};${align}">${formatInlineText(block.body)}</p>
  </td></tr>`;
}

// Was een vaste 180px thumbnail naast de rest — nu een zelf te kiezen
// percentage (editor: schuifje 20-80%), zodat een bestuurslid zelf bepaalt
// hoeveel ruimte de foto t.o.v. de tekst krijgt. Percentages i.p.v. pixels
// omdat tabel-kolombreedtes in e-mailclients daar betrouwbaarder mee
// meeschalen dan met een vaste pixelbreedte plus losse max-width.
function renderImageBlock(block: Extract<NewsletterBlock, { type: "image" }>): string {
  const img = `<img src="${escapeHtml(block.url)}" alt="" width="552" style="width:100%;max-width:552px;height:auto;border-radius:12px;display:block;" />`;

  if (block.layout === "full") {
    return `<tr><td style="padding:0 24px 24px;">${img}</td></tr>`;
  }

  const imgPct = Math.min(80, Math.max(20, block.imageWidthPercent ?? 33));
  const textPct = 100 - imgPct;
  const thumb = `<img src="${escapeHtml(block.url)}" alt="" style="width:100%;height:auto;border-radius:8px;display:block;" />`;
  const text = `${block.title ? `<h3 style="margin:0 0 4px;font-size:16px;color:${COLORS.foreground};font-family:${FONT};">${escapeHtml(block.title)}</h3>` : ""}${
    block.body ? `<p style="margin:0;font-size:14px;line-height:1.5;color:${COLORS.foreground};font-family:${FONT};">${formatInlineText(block.body)}</p>` : ""
  }`;
  const imgCell = `<td class="vocnl-stack" width="${imgPct}%" style="width:${imgPct}%;padding:0;vertical-align:top;">${thumb}</td>`;
  const textCellLeft = `<td class="vocnl-stack" width="${textPct}%" style="width:${textPct}%;padding:0 0 0 16px;vertical-align:top;">${text}</td>`;
  const textCellRight = `<td class="vocnl-stack" width="${textPct}%" style="width:${textPct}%;padding:0 16px 0 0;vertical-align:top;">${text}</td>`;

  return `<tr><td style="padding:0 24px 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr>${block.layout === "left" ? imgCell + textCellLeft : textCellRight + imgCell}</tr>
    </table>
  </td></tr>`;
}

function renderButtonBlock(block: Extract<NewsletterBlock, { type: "button" }>): string {
  return `<tr><td align="${block.align ?? "left"}" style="padding:0 24px 28px;${alignStyle(block.align)}">
    <a href="${escapeHtml(block.url)}" style="display:inline-block;background:${COLORS.green};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:${BUTTON_RADIUS};font-family:${FONT};">${escapeHtml(block.label)}</a>
  </td></tr>`;
}

function renderDividerBlock(): string {
  return `<tr><td style="padding:0 24px 24px;"><hr style="border:none;border-top:1px solid ${COLORS.border};margin:0;" /></td></tr>`;
}

function renderEventBlock(block: Extract<NewsletterBlock, { type: "event" }>): string {
  if (!block.activityId) {
    return `<tr><td style="padding:0 24px 24px;">
      <div style="border:1px dashed ${COLORS.border};border-radius:12px;padding:20px;text-align:center;">
        <p style="margin:0;font-size:14px;color:${COLORS.muted};font-family:${FONT};">Nog geen evenement gekozen</p>
      </div>
    </td></tr>`;
  }

  const img = block.imageUrl
    ? `<img src="${escapeHtml(block.imageUrl)}" alt="" width="552" style="width:100%;max-width:552px;height:auto;border-radius:12px;display:block;margin:0 0 12px;" />`
    : "";
  const dateLine = `<p style="margin:0 0 2px;font-size:14px;font-weight:600;color:${COLORS.red};font-family:${FONT};">${escapeHtml(formatActivityDate(block.startsAtIso))}</p>`;
  const locationLine = block.location
    ? `<p style="margin:0 0 10px;font-size:14px;color:${COLORS.muted};font-family:${FONT};">${escapeHtml(block.location)}</p>`
    : "";
  const description = block.description
    ? `<p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:${COLORS.foreground};font-family:${FONT};">${nl2br(block.description)}</p>`
    : "";

  return `<tr><td style="padding:0 24px 24px;">
    <div style="border:1px solid ${COLORS.border};border-radius:12px;padding:16px;">
      ${img}
      <h2 style="margin:0 0 6px;font-size:18px;line-height:1.3;color:${COLORS.foreground};font-family:${FONT};">${escapeHtml(block.title)}</h2>
      ${dateLine}
      ${locationLine}
      ${description}
      <a href="${escapeHtml(block.linkUrl)}" style="display:inline-block;margin-top:14px;background:${COLORS.green};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:10px 20px;border-radius:${BUTTON_RADIUS};font-family:${FONT};">${escapeHtml(block.buttonLabel || "Bekijk evenement")}</a>
    </div>
  </td></tr>`;
}

// Zelfde drie VOC-social-URL's als VocSocialLinks.tsx (de "Volg ons"-rij
// elders in de app) — hier gedupliceerd omdat de React-iconcomponent daar
// niet herbruikbaar is in e-mailveilige HTML. De iconbestanden zelf staan
// als losse SVG's in public/brand/ (zelfde aanpak als het logo hierboven).
const VOC_SOCIAL_LINKS = [
  { href: "https://www.linkedin.com/company/veendam/", label: "LinkedIn", icon: "social-linkedin.svg" },
  { href: "https://www.facebook.com/vocveendam", label: "Facebook", icon: "social-facebook.svg" },
  { href: "https://www.instagram.com/vocveendam/", label: "Instagram", icon: "social-instagram.svg" },
];

// Vast maar uitzetbaar (communications.show_header) — het VOC-beeldmerk
// bovenaan, zoals de bestaande VOC-mails ook altijd hebben. siteUrl is leeg
// in de live preview (dan is een relatief pad binnen dezelfde app prima);
// voor een echte verzending moet de link absoluut zijn, dus geeft de
// aanroeper dan altijd SITE_URL mee.
function renderHeader(siteUrl: string): string {
  const logoUrl = `${siteUrl}/brand/voc-logo-mark.png`;
  return `<tr><td align="center" style="padding:28px 24px 8px;">
    <img src="${escapeHtml(logoUrl)}" alt="VOC" width="48" style="width:48px;height:auto;display:block;" />
  </td></tr>`;
}

// Vast maar uitzetbaar (communications.show_footer) — zelfde opbouw als de
// bestaande VOC-mails: een korte uitnodigingstekst boven een rij met
// werkelijke social-iconen (geen platte tekstlinks).
function renderFooter(siteUrl: string): string {
  const iconCells = VOC_SOCIAL_LINKS.map(
    (link) => `<td style="padding:0 6px;">
      <a href="${escapeHtml(link.href)}">
        <img src="${escapeHtml(`${siteUrl}/brand/${link.icon}`)}" alt="${escapeHtml(link.label)}" width="32" height="32" style="display:block;width:32px;height:32px;" />
      </a>
    </td>`
  ).join("");

  return `<tr><td style="padding:24px 24px 4px;border-top:1px solid ${COLORS.border};">
    <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:${COLORS.foreground};font-family:${FONT};text-align:center;">Volg jij ons al op de socials?</p>
    <p style="margin:0 0 14px;font-size:12px;color:${COLORS.muted};font-family:${FONT};text-align:center;">Blijf op de hoogte van onze activiteiten en het laatste nieuws.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
      <tr>${iconCells}</tr>
    </table>
    <p style="margin:14px 0 0;font-size:11px;color:${COLORS.muted};font-family:${FONT};text-align:center;">Veendammer Ondernemers Compagnie</p>
  </td></tr>`;
}

function renderBlock(block: NewsletterBlock): string {
  switch (block.type) {
    case "text":
      return renderTextBlock(block);
    case "image":
      return renderImageBlock(block);
    case "button":
      return renderButtonBlock(block);
    case "divider":
      return renderDividerBlock();
    case "event":
      return renderEventBlock(block);
  }
}

/**
 * Zet de JSONB-blokken van een communications-rij om in e-mailveilige,
 * tabel-gebaseerde HTML — dezelfde functie voor preview, testmail én
 * definitieve verzending, zodat wat je ziet exact is wat verstuurd wordt.
 */
export function renderNewsletterHtml(
  blocks: NewsletterBlock[],
  meta: {
    subject: string;
    preheader?: string | null;
    // Allebei standaard aan — "vast maar bewerkbaar", zie communications.
    // show_header/show_footer. siteUrl is leeg in de live preview (een
    // relatief pad werkt daar prima, binnen dezelfde app) en moet voor een
    // echte verzending altijd SITE_URL zijn, anders breekt het logo.
    showHeader?: boolean;
    showFooter?: boolean;
    siteUrl?: string;
  }
): string {
  // Onzichtbare preview-tekst: de gangbare manier waarop vrijwel elke
  // e-maildienst de pre-header implementeert. De zwnj-opvulling voorkomt
  // dat de inbox-preview daarna de eerste zichtbare regel erachter plakt.
  const preheaderHtml = meta.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(meta.preheader)}${"&nbsp;&zwnj;".repeat(8)}</div>`
    : "";

  const siteUrl = (meta.siteUrl ?? "").replace(/\/$/, "");
  const headerHtml =
    meta.showHeader ?? true
      ? renderHeader(siteUrl)
      : `<tr><td style="height:24px;line-height:24px;font-size:0;">&nbsp;</td></tr>`;
  const footerHtml =
    meta.showFooter ?? true
      ? renderFooter(siteUrl)
      : `<tr><td style="height:8px;line-height:8px;font-size:0;">&nbsp;</td></tr>`;

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(meta.subject)}</title>
<style>
  @media only screen and (max-width: 480px) {
    .vocnl-stack { display: block !important; width: 100% !important; padding-left: 0 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${COLORS.background};">
${preheaderHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.background};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${COLORS.surface};border-radius:16px;overflow:hidden;">
${headerHtml}
${blocks.map(renderBlock).join("\n")}
${footerHtml}
</table>
</td></tr>
</table>
</body>
</html>`;
}
