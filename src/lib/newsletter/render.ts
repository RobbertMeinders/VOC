import "server-only";

import { escapeHtml } from "@/lib/email/send";
import type { NewsletterBlock } from "./types";

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
};

const FONT = "-apple-system, 'Segoe UI', Arial, sans-serif";

function nl2br(text: string): string {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

function renderTextBlock(block: Extract<NewsletterBlock, { type: "text" }>): string {
  return `<tr><td style="padding:0 24px 24px;">
    ${block.title ? `<h2 style="margin:0 0 4px;font-size:20px;line-height:1.3;color:${COLORS.foreground};font-family:${FONT};">${escapeHtml(block.title)}</h2>` : ""}
    ${block.subtitle ? `<p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${COLORS.muted};font-family:${FONT};">${escapeHtml(block.subtitle)}</p>` : ""}
    <p style="margin:0;font-size:14px;line-height:1.6;color:${COLORS.foreground};font-family:${FONT};">${nl2br(block.body)}</p>
  </td></tr>`;
}

function renderImageBlock(block: Extract<NewsletterBlock, { type: "image" }>): string {
  const img = `<img src="${escapeHtml(block.url)}" alt="" width="552" style="width:100%;max-width:552px;height:auto;border-radius:12px;display:block;" />`;

  if (block.layout === "full") {
    return `<tr><td style="padding:0 24px 24px;">${img}</td></tr>`;
  }

  const thumb = `<img src="${escapeHtml(block.url)}" alt="" width="180" style="width:100%;max-width:180px;height:auto;border-radius:8px;display:block;" />`;
  const text = `${block.title ? `<h3 style="margin:0 0 4px;font-size:16px;color:${COLORS.foreground};font-family:${FONT};">${escapeHtml(block.title)}</h3>` : ""}${
    block.body ? `<p style="margin:0;font-size:14px;line-height:1.5;color:${COLORS.foreground};font-family:${FONT};">${nl2br(block.body)}</p>` : ""
  }`;
  const imgCell = `<td class="vocnl-stack" width="180" style="padding:0;vertical-align:top;">${thumb}</td>`;
  const textCell = `<td class="vocnl-stack" style="padding:0 0 0 16px;vertical-align:top;">${text}</td>`;

  return `<tr><td style="padding:0 24px 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr>${block.layout === "left" ? imgCell + textCell : textCell.replace("padding:0 0 0 16px", "padding:0 16px 0 0") + imgCell}</tr>
    </table>
  </td></tr>`;
}

function renderButtonBlock(block: Extract<NewsletterBlock, { type: "button" }>): string {
  return `<tr><td style="padding:0 24px 28px;">
    <a href="${escapeHtml(block.url)}" style="display:inline-block;background:${COLORS.red};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:999px;font-family:${FONT};">${escapeHtml(block.label)}</a>
  </td></tr>`;
}

function renderDividerBlock(): string {
  return `<tr><td style="padding:0 24px 24px;"><hr style="border:none;border-top:1px solid ${COLORS.border};margin:0;" /></td></tr>`;
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
  }
}

/**
 * Zet de JSONB-blokken van een communications-rij om in e-mailveilige,
 * tabel-gebaseerde HTML — dezelfde functie voor preview, testmail én
 * definitieve verzending, zodat wat je ziet exact is wat verstuurd wordt.
 */
export function renderNewsletterHtml(
  blocks: NewsletterBlock[],
  meta: { subject: string; preheader?: string | null }
): string {
  // Onzichtbare preview-tekst: de gangbare manier waarop vrijwel elke
  // e-maildienst de pre-header implementeert. De zwnj-opvulling voorkomt
  // dat de inbox-preview daarna de eerste zichtbare regel erachter plakt.
  const preheaderHtml = meta.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(meta.preheader)}${"&nbsp;&zwnj;".repeat(8)}</div>`
    : "";

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
<tr><td style="height:24px;line-height:24px;font-size:0;">&nbsp;</td></tr>
${blocks.map(renderBlock).join("\n")}
<tr><td style="height:8px;line-height:8px;font-size:0;">&nbsp;</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
