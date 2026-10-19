import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendRawHtmlEmail } from "@/lib/email/send";
import { fetchAppSettings } from "@/lib/settings/app-settings";
import { renderNewsletterHtml, renderFooterUnsubscribeLine, UNSUBSCRIBE_LINE_TOKEN } from "./render";
import { buildUnsubscribeUrl } from "./unsubscribe";
import type { NewsletterBlock } from "./types";
import type { Database } from "@/lib/types/database";

type Communication = Database["public"]["Tables"]["communications"]["Row"];

export type NewsletterSendResult = { total: number; sent: number; alreadySending?: boolean };

// Gedeeld tussen sendNewsletterAction (de "Versturen"-knop, bestuurslid met
// sessie) en de cron die ingeplande campagnes oppakt (geen sessie, draait
// via de service-role-client) — zelfde claim/render/verzend/finalize-lus
// voor allebei, zie 0067/0069/0089_newsletter_*.sql voor waarom die RPC's
// beide aanroeppaden toestaan. Leden (notifications-rijen) en externe
// contacten (communication_contact_sends-rijen, zie 0089) hebben elk hun
// eigen claim/mark-RPC-paar maar delen hier dezelfde render/verzend-lus en
// dezelfde finalize-aanroep, die beide tellingen samenvoegt.
export async function performNewsletterSend(
  supabase: SupabaseClient<Database>,
  communication: Communication
): Promise<NewsletterSendResult> {
  // F3: zonder deze atomaire claim konden twee gelijktijdige aanroepen voor
  // dezelfde communication (bv. handmatig "Versturen" terwijl de cron voor
  // een ingeplande verzending net ook afgaat) allebei dezelfde nog-niet-
  // verstuurde ontvangers te zien krijgen en dus allebei een mail sturen.
  // Wie de rij niet als eerste naar 'versturen' kan zetten, stopt meteen.
  const { data: claimed, error: lockError } = await supabase.rpc("claim_newsletter_send", {
    p_communication_id: communication.id,
  });
  if (lockError) {
    throw new Error("Versturen starten is niet gelukt.");
  }
  if (!claimed) {
    return { total: 0, sent: 0, alreadySending: true };
  }

  try {
    const content = Array.isArray(communication.content) ? (communication.content as unknown as NewsletterBlock[]) : [];

    const [{ data: recipients, error: claimError }, { data: contactRecipients, error: contactClaimError }] = await Promise.all([
      supabase.rpc("claim_newsletter_recipients", { p_communication_id: communication.id }),
      supabase.rpc("claim_newsletter_contact_recipients", { p_communication_id: communication.id }),
    ]);
    if (claimError || contactClaimError) {
      throw new Error("Ontvangerslijst ophalen is niet gelukt.");
    }

    const settings = await fetchAppSettings(supabase);
    const siteUrl = process.env.SITE_URL ?? "";
    const htmlTemplate = renderNewsletterHtml(content, {
      subject: communication.subject,
      preheader: communication.preheader,
      showHeader: communication.show_header,
      showFooter: communication.show_footer,
      siteUrl,
      orgName: settings.org_name,
      logoUrl: settings.logo_url,
    });

    for (const recipient of recipients ?? []) {
      const unsubscribeUrl = buildUnsubscribeUrl(siteUrl, "profile", recipient.profile_id);
      const html = htmlTemplate.replace(
        UNSUBSCRIBE_LINE_TOKEN,
        renderFooterUnsubscribeLine({ variant: "member", orgName: settings.org_name, siteUrl, unsubscribeUrl })
      );
      const result = await sendRawHtmlEmail(recipient.email, communication.subject, html, communication.sender_name, undefined, {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      });
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

    for (const recipient of contactRecipients ?? []) {
      const unsubscribeUrl = buildUnsubscribeUrl(siteUrl, "contact", recipient.contact_id);
      const html = htmlTemplate.replace(
        UNSUBSCRIBE_LINE_TOKEN,
        renderFooterUnsubscribeLine({ variant: "contact", orgName: settings.org_name, unsubscribeUrl })
      );
      const result = await sendRawHtmlEmail(recipient.email, communication.subject, html, communication.sender_name, undefined, {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      });
      if (!result.error) {
        await supabase.rpc("mark_newsletter_contact_sent", {
          p_send_id: recipient.send_id,
          p_provider_id: result.providerId ?? null,
        });
      }
    }

    const { data: finalized } = await supabase.rpc("finalize_newsletter_send", { p_communication_id: communication.id });
    return { total: finalized?.[0]?.total ?? 0, sent: finalized?.[0]?.sent ?? 0 };
  } catch (err) {
    // De claim hierboven liet de rij op 'versturen' staan — zonder dit zou
    // een onverwachte fout halverwege de lus 'm daar permanent op laten
    // staan (nooit meer te claimen, ook niet door de 10-minuten-stale-
    // uitzondering in claim_newsletter_send als de fout meteen optreedt).
    // finalize_newsletter_send zet de status altijd terug naar 'verzonden'
    // of 'verzenden_mislukt' op basis van wat er écht al verstuurd is.
    await supabase.rpc("finalize_newsletter_send", { p_communication_id: communication.id });
    throw err;
  }
}
