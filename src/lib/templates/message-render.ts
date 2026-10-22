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

// Outlook (de Word-rendering-engine) ondersteunt CSS border-radius op geen
// enkel element — de eerdere <td>-fix loste alleen de ontbrekende padding
// op, de hoeken bleven haaks (live feedback: "knop is nog niet mooi" bleef
// terugkomen, ook na die fix). VML is de enige manier om in Outlook toch
// afgeronde hoeken te krijgen, en is alleen zichtbaar binnen een
// <!--[if mso]>-blok: elke andere mailclient leest dat als gewoon
// HTML-commentaar en toont in plaats daarvan het blok na
// <!--[if !mso]><!-->. Zelfde patroon als renderButton in
// newsletter/render.ts. v:roundrect kent geen automatische breedte, dus
// die wordt hier ruw geschat op basis van de labellengte.
function renderCta(url: string, label: string): string {
  const escapedUrl = escapeHtml(url);
  const escapedLabel = escapeHtml(label);
  const width = Math.max(140, label.length * 9 + 48);
  return `<div style="margin:4px 0 16px;">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapedUrl}" style="height:44px;v-text-anchor:middle;width:${width}px;" arcsize="18%" stroke="f" fillcolor="#e8000f">
<center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:bold;">${escapedLabel}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="${escapedUrl}" style="background-color:#e8000f;border-radius:8px;color:#ffffff;display:inline-block;font-family:sans-serif;font-size:14px;font-weight:700;line-height:44px;padding:0 20px;text-align:center;text-decoration:none;">${escapedLabel}</a>
<!--<![endif]-->
</div>`;
}

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
  const cta = renderCta(link, template.cta_label);
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
