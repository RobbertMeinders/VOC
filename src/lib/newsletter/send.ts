import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendRawHtmlEmail } from "@/lib/email/send";
import { fetchAppSettings } from "@/lib/settings/app-settings";
import { renderNewsletterHtml } from "./render";
import type { NewsletterBlock } from "./types";
import type { Database } from "@/lib/types/database";

type Communication = Database["public"]["Tables"]["communications"]["Row"];

export type NewsletterSendResult = { total: number; sent: number };

// Gedeeld tussen sendNewsletterAction (de "Versturen"-knop, bestuurslid met
// sessie) en de cron die ingeplande campagnes oppakt (geen sessie, draait
// via de service-role-client) — zelfde claim/render/verzend/finalize-lus
// voor allebei, zie 0067/0069_newsletter_*.sql voor waarom die RPC's beide
// aanroeppaden toestaan.
export async function performNewsletterSend(
  supabase: SupabaseClient<Database>,
  communication: Communication
): Promise<NewsletterSendResult> {
  const content = Array.isArray(communication.content) ? (communication.content as unknown as NewsletterBlock[]) : [];

  const { data: recipients, error: claimError } = await supabase.rpc("claim_newsletter_recipients", {
    p_communication_id: communication.id,
  });
  if (claimError) {
    throw new Error("Ontvangerslijst ophalen is niet gelukt.");
  }

  const settings = await fetchAppSettings(supabase);
  const html = renderNewsletterHtml(content, {
    subject: communication.subject,
    preheader: communication.preheader,
    showHeader: communication.show_header,
    showFooter: communication.show_footer,
    siteUrl: process.env.SITE_URL,
    orgName: settings.org_name,
    logoUrl: settings.logo_url,
  });

  for (const recipient of recipients ?? []) {
    const result = await sendRawHtmlEmail(recipient.email, communication.subject, html, communication.sender_name);
    if (!result.error) {
      // Direct na elke individuele, al-geslaagde verzending — nooit
      // gebufferd tot het einde van de lus (zie sendNewsletterAction voor
      // de volledige uitleg van dit patroon).
      await supabase.rpc("mark_newsletter_notification_sent", {
        p_notification_id: recipient.notification_id,
        p_provider_id: result.providerId ?? null,
      });
    }
  }

  const { data: finalized } = await supabase.rpc("finalize_newsletter_send", { p_communication_id: communication.id });
  return { total: finalized?.[0]?.total ?? 0, sent: finalized?.[0]?.sent ?? 0 };
}
