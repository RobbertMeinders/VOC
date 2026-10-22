import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendRawHtmlEmail } from "@/lib/email/send";
import { fetchAppSettings } from "@/lib/settings/app-settings";
import { renderNewsletterHtml, renderFooterUnsubscribeLine, UNSUBSCRIBE_LINE_TOKEN } from "./render";
import { buildUnsubscribeUrl, buildPreferencesUrl } from "./unsubscribe";
import type { NewsletterBlock } from "./types";
import type { Database } from "@/lib/types/database";

type Communication = Database["public"]["Tables"]["communications"]["Row"];
export type NewsletterSendKind = Database["public"]["Tables"]["communication_send_attempts"]["Row"]["kind"];

export type NewsletterSendResult = {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  alreadySending?: boolean;
  // Portaal-gezondheid Blok C: true als deze aanroep bewust is gestopt vóór
  // het einde van de ontvangerslijst (zie maxPerRun hieronder) — er staan
  // dan nog onverwerkte 'wachten'-rijen klaar voor een volgende aanroep.
  hasMore?: boolean;
};

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
  kind: NewsletterSendKind,
  // Portaal-gezondheid Blok C: de cron (maxDuration 300s) geeft dit mee om
  // een grote verzending over meerdere cron-runs te spreiden i.p.v. het
  // platform de hele functie hard te laten afbreken halverwege een
  // verzending — zie de toelichting bij hasMore/de return hieronder. De
  // "Versturen"-knop (sendNewsletterAction) laat dit bewust weg: een
  // bestuurslid dat zelf op de knop klikt, wacht de hele verzending gewoon
  // af, net als voorheen.
  maxPerRun?: number
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

    const allClaimed = recipients ?? [];
    // maxPerRun ontbreekt (handmatige "Versturen"-knop): geen limiet, exact
    // hetzelfde gedrag als voorheen.
    const toProcess = maxPerRun ? allClaimed.slice(0, maxPerRun) : allClaimed;
    const hasMore = toProcess.length < allClaimed.length;

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const recipient of toProcess) {
      const isContact = recipient.contact_id !== null;
      const recipientId = (isContact ? recipient.contact_id : recipient.profile_id)!;
      const unsubscribeUrl = buildUnsubscribeUrl(siteUrl, isContact ? "contact" : "profile", recipientId);
      const html = htmlTemplate.replace(
        UNSUBSCRIBE_LINE_TOKEN,
        renderFooterUnsubscribeLine(
          isContact
            ? { variant: "contact", orgName: settings.org_name, unsubscribeUrl }
            : {
                variant: "member",
                orgName: settings.org_name,
                unsubscribeUrl,
                preferencesUrl: buildPreferencesUrl(siteUrl, "profile", recipientId),
              }
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
        sentCount++;
      } else if (result.skipped) {
        // Bewust genegeerd door beleid (EMAIL_ALLOWLIST), geen echte
        // verzendfout — telt bij finalize mee als "klaar", niet "mislukt".
        await markOrThrow(supabase, recipient.email, async () =>
          supabase.rpc("mark_newsletter_delivery_skipped", { p_delivery_id: recipient.delivery_id, p_reason: result.error ?? "Overgeslagen" })
        );
        skippedCount++;
      } else {
        await markOrThrow(supabase, recipient.email, async () =>
          supabase.rpc("mark_newsletter_delivery_failed", { p_delivery_id: recipient.delivery_id, p_reason: result.error ?? "Onbekende fout" })
        );
        failedCount++;
      }
    }

    if (hasMore) {
      // Bewust gestopt vóór het einde van de ontvangerslijst (maxPerRun) —
      // NIET finalizen: finalize_newsletter_send_v2 telt over ALLE
      // deliveries van deze communication (niet alleen deze poging), en zou
      // de nog niet-geprobeerde 'wachten'-rijen verkeerd als "mislukt"
      // boeken. De rij blijft op status 'versturen' staan; claim_newsletter_
      // send (0098) staat die na 10 minuten stilstand weer toe te claimen,
      // en claim_newsletter_deliveries (0116) zet alles wat nog 'wachten' is
      // dan gewoon opnieuw klaar voor de volgende cron-tick — zelfde
      // herstelpad als bij een onverwachte crash (N3/D6).
      return { total: allClaimed.length, sent: sentCount, failed: failedCount, skipped: skippedCount, hasMore: true };
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
