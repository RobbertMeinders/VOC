import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendRawHtmlEmail } from "@/lib/email/send";
import { fetchAppSettings } from "@/lib/settings/app-settings";
import { renderNewsletterHtml, renderFooterUnsubscribeLine, UNSUBSCRIBE_LINE_TOKEN } from "./render";
import { buildUnsubscribeUrl } from "./unsubscribe";
import type { NewsletterBlock } from "./types";
import type { Database } from "@/lib/types/database";

type Communication = Database["public"]["Tables"]["communications"]["Row"];
export type NewsletterSendKind = Database["public"]["Tables"]["communication_send_attempts"]["Row"]["kind"];

export type NewsletterSendResult = { total: number; sent: number; failed: number; skipped: number; alreadySending?: boolean };

// N4: de mail is dan al écht verstuurd, maar als het markeren zelf mislukt
// (een kortstondig DB-foutje) blijft de rij op 'wachten' staan — en zonder
// deze check zou een volgende poging diezelfde ontvanger domweg nog een
// keer mailen. Een paar keer opnieuw proberen vangt zo'n kortstondig foutje
// vrijwel altijd op; blijft het mislukken, dan stopt de hele verzending
// meteen (de catch hieronder in performNewsletterSend) i.p.v. door te gaan
// zonder te weten of de boekhouding nog klopt.
async function markOrThrow(
  supabase: SupabaseClient<Database>,
  label: string,
  run: () => Promise<{ error: { message: string } | null }>
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await run();
    if (!error) return;
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
  }
  throw new Error(`Markeren als verstuurd/mislukt is niet gelukt (${label}) - verzending gestopt om niemand dubbel te mailen.`);
}

// Gedeeld tussen sendNewsletterAction (de "Versturen"-knop, bestuurslid met
// sessie) en de cron die ingeplande campagnes oppakt (geen sessie, draait
// via de service-role-client). B1/N5: één claim-functie i.p.v. twee (leden
// en contacten samen, ontdubbeld op e-mailadres — zie
// claim_newsletter_deliveries, 0116_communication_deliveries.sql) en één
// tabel voor de verzendgeschiedenis i.p.v. notifications (leden) +
// communication_contact_sends (contacten) apart.
export async function performNewsletterSend(
  supabase: SupabaseClient<Database>,
  communication: Communication,
  kind: NewsletterSendKind
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
    return { total: 0, sent: 0, failed: 0, skipped: 0, alreadySending: true };
  }

  try {
    const content = Array.isArray(communication.content) ? (communication.content as unknown as NewsletterBlock[]) : [];

    const { data: recipients, error: claimError } = await supabase.rpc("claim_newsletter_deliveries", {
      p_communication_id: communication.id,
      p_kind: kind,
    });
    if (claimError) {
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
      const isContact = recipient.contact_id !== null;
      const unsubscribeUrl = buildUnsubscribeUrl(siteUrl, isContact ? "contact" : "profile", (isContact ? recipient.contact_id : recipient.profile_id)!);
      const html = htmlTemplate.replace(
        UNSUBSCRIBE_LINE_TOKEN,
        renderFooterUnsubscribeLine(
          isContact
            ? { variant: "contact", orgName: settings.org_name, unsubscribeUrl }
            : { variant: "member", orgName: settings.org_name, siteUrl, unsubscribeUrl }
        )
      );
      const result = await sendRawHtmlEmail(recipient.email, communication.subject, html, communication.sender_name, undefined, {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      });

      if (!result.error) {
        // Direct na elke individuele, al-geslaagde verzending — nooit
        // gebufferd tot het einde van de lus.
        await markOrThrow(supabase, recipient.email, async () =>
          supabase.rpc("mark_newsletter_delivery_sent", { p_delivery_id: recipient.delivery_id, p_provider_id: result.providerId ?? null })
        );
      } else if (result.skipped) {
        // Bewust genegeerd door beleid (EMAIL_ALLOWLIST), geen echte
        // verzendfout — telt bij finalize mee als "klaar", niet "mislukt".
        await markOrThrow(supabase, recipient.email, async () =>
          supabase.rpc("mark_newsletter_delivery_skipped", { p_delivery_id: recipient.delivery_id, p_reason: result.error ?? "Overgeslagen" })
        );
      } else {
        await markOrThrow(supabase, recipient.email, async () =>
          supabase.rpc("mark_newsletter_delivery_failed", { p_delivery_id: recipient.delivery_id, p_reason: result.error ?? "Onbekende fout" })
        );
      }
    }

    const { data: finalized } = await supabase.rpc("finalize_newsletter_send_v2", { p_communication_id: communication.id });
    return {
      total: finalized?.[0]?.total ?? 0,
      sent: finalized?.[0]?.sent ?? 0,
      failed: finalized?.[0]?.failed ?? 0,
      skipped: finalized?.[0]?.skipped ?? 0,
    };
  } catch (err) {
    // De claim hierboven liet de rij op 'versturen' staan — zonder dit zou
    // een onverwachte fout halverwege de lus 'm daar permanent op laten
    // staan (nooit meer te claimen, ook niet door de 10-minuten-stale-
    // uitzondering in claim_newsletter_send als de fout meteen optreedt).
    // finalize_newsletter_send_v2 zet de status altijd terug op basis van
    // wat er écht al verstuurd/overgeslagen is.
    await supabase.rpc("finalize_newsletter_send_v2", { p_communication_id: communication.id });
    throw err;
  }
}
