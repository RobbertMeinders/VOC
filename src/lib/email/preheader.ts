import { escapeHtml } from "@/lib/text/escape-html";

// B2: automatische e-mails (herinneringen, uitnodigingen, en de overige
// message_templates-berichten) hadden geen onzichtbare preheader -- zonder
// dat element valt een mailclient terug op de eerste zichtbare regel als
// inbox-voorbeeldtekst, en dat is bij deze mails vaak de knoptekst/link
// ("Klik hier met de..."). Zelfde patroon als renderNewsletterHtml
// (newsletter/render.ts), hier herbruikt voor de rest van de e-mails. De
// zwnj-opvulling voorkomt dat de inbox-preview daarna de eerste zichtbare
// regel er toch achteraan plakt.
export function renderHiddenPreheader(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  // Volledige set verbergings-eigenschappen i.p.v. alleen display:none -- een
  // enkele client die display:none om wat voor reden dan ook niet (volledig)
  // respecteert, heeft dan nog steeds font-size/line-height:1px en
  // max-width/max-height:0 als vangnet. mso-hide:all is specifiek voor
  // Outlook desktop (de Word-rendering-engine), die andere eigenschappen
  // negeert.
  return `<div style="display:none;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;overflow:hidden;opacity:0;">${escapeHtml(trimmed)}${"&nbsp;&zwnj;".repeat(8)}</div>`;
}

// Platte, korte samenvatting uit HTML-inhoud (tags/witruimte eruit), afgekapt
// op een woordgrens zodat de preview niet halverwege een woord afbreekt.
export function htmlToPreheaderText(html: string, maxLength = 150): string {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).replace(/\s+\S*$/, "")}…`;
}
