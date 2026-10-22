import "server-only";

import { createClient } from "@/lib/supabase/server";
import { renderTemplate } from "@/lib/template/render";
import { escapeHtml } from "@/lib/text/escape-html";
import { getAppSettings } from "@/lib/settings/app-settings";
import { renderSignature } from "@/lib/templates/signature";
import { renderHiddenPreheader, htmlToPreheaderText } from "@/lib/email/preheader";

export type MessageTemplateRow = {
  subject: string;
  body_html: string;
  cta_label: string;
  after_html: string;
  signature_type: "alg" | "pers";
  push_title: string | null;
  push_body: string | null;
};

// Zelfde rode knopstijl als het ontwerpvoorbeeld (docs/design/automatische-
// berichten) — inline, want e-mailclients negeren een los stylesheet.
const CTA_STYLE =
  "display:inline-block;background:#e8000f;color:#fff;font-weight:700;padding:11px 20px;border-radius:8px;text-decoration:none;margin:4px 0 16px";

// Zelfde bewoording/stijl als de bestaande notificatiemail-voettekst
// (lib/email/send.ts), bewust hergebruikt i.p.v. een tweede variant. Wijst
// naar /voorkeuren?token=... (geen login nodig, zie src/app/voorkeuren/
// route.ts) i.p.v. /instellingen, met hetzelfde ondertekende token als de
// afmeldlink.
function preferencesFooter(preferencesUrl: string): string {
  return `<p style="margin-top:20px;padding-top:12px;border-top:1px solid #e5e5ea;font-size:12px;color:#6b6b72;">Je ontvangt dit als lid van de Veendammer Ondernemers Compagnie. <a href="${escapeHtml(preferencesUrl)}" style="color:#6b6b72;">Meldingen aanpassen</a></p>`;
}

export async function getMessageTemplate(key: string): Promise<MessageTemplateRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_message_template", { p_key: key });
  const row = data?.[0];
  if (!row) return null;
  return { ...row, signature_type: row.signature_type === "pers" ? "pers" : "alg" };
}

// Bouwt de verzendklare mail op uit een template-rij: {{var}}-substitutie
// (subject als platte tekst, body/after als HTML-geëscaped — zelfde aanpak
// als sendTemplatedEmail), de vaste knop-CTA (altijd {{link}} als bestemming,
// geen los {{link}}-token nodig/toegestaan in de body zelf), de bijpassende
// handtekening en optioneel de voorkeurenvoettekst.
export async function renderMessageEmail(
  key: string,
  link: string,
  variables: Record<string, string>,
  options?: { preferencesUrl?: string }
): Promise<{ subject: string; html: string } | null> {
  const template = await getMessageTemplate(key);
  if (!template) return null;

  const settings = await getAppSettings();
  const escapedVariables = Object.fromEntries(Object.entries(variables).map(([k, v]) => [k, escapeHtml(v)]));

  const subject = renderTemplate(template.subject, variables);
  const body = renderTemplate(template.body_html, escapedVariables);
  const after = renderTemplate(template.after_html, escapedVariables);
  const cta = `<a href="${escapeHtml(link)}" style="${CTA_STYLE}">${escapeHtml(template.cta_label)}</a>`;
  const signature = `<div style="margin-top:22px">${renderSignature(template.signature_type, settings)}</div>`;

  const preheader = renderHiddenPreheader(htmlToPreheaderText(body));
  const html = preheader + body + cta + after + signature + (options?.preferencesUrl ? preferencesFooter(options.preferencesUrl) : "");
  return { subject, html };
}

// Voor pushmeldingen (geen HTML, geen knop/handtekening) — simpele
// {{var}}-substitutie van de opgeslagen push_title/push_body.
export function renderMessagePush(
  template: Pick<MessageTemplateRow, "push_title" | "push_body">,
  variables: Record<string, string>
): { title: string; body: string } | null {
  if (!template.push_title || !template.push_body) return null;
  return {
    title: renderTemplate(template.push_title, variables),
    body: renderTemplate(template.push_body, variables),
  };
}
