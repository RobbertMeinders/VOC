import "server-only";

import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

function renderTemplate(template: string, variables: Record<string, string>): string {
  return Object.entries(variables).reduce(
    (rendered, [key, value]) => rendered.replaceAll(`{{${key}}}`, value),
    template
  );
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
