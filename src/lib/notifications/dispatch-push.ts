import "server-only";

import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderTemplate } from "@/lib/template/render";
import { logPushUnsubscribed } from "@/lib/events/log";

// Notificatietypes met een beheerbaar push_title/push_body op
// message_templates (migratie 0129, Automatische berichten) — mirror van
// NOTIFICATION_MESSAGE_TEMPLATE_KEYS (src/lib/email/send.ts). Overige types
// gaan altijd met de rauwe titel/body van de notificatie zelf.
const NOTIFICATION_PUSH_TEMPLATE_KEYS: Record<string, string> = {
  new_activity: "nieuw-act",
  new_member: "nieuw-lid",
  feed_comment: "reactie",
  feed_mention: "genoemd",
  activity_reminder: "herinnering",
  waitlist_promoted: "wachtlijst",
};

// UX-review punt 2: deze functie bevatte eerder alleen de cron-route zelf
// (/api/cron/send-push) — verplaatst hierheen zodat zowel de cron (als
// vangnet, 1x per dag) als een directe aanroep vlak na de onderliggende
// actie (via next/server's after(), zie agenda/actions.ts en (app)/
// actions.ts) exact dezelfde RPC's/mark_notifications_pushed-afhandeling
// gebruiken — geen nieuwe verzendroute, geen dubbel-verzend-risico (de rij
// is na deze aanroep al pushed_at, dus de cron slaat 'm vanzelf over).
export async function dispatchPendingPushNotifications(limit = 50): Promise<{ sent: number }> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    // Zonder deze regel faalde dit volledig stil: een lid kan pushmeldingen
    // in de instellingen "aanzetten" zonder te weten dat er, bij een
    // ontbrekende serversleutel, server-side nooit iets wordt verstuurd.
    console.error("Push niet verstuurd: NEXT_PUBLIC_VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY ontbreekt.");
    return { sent: 0 };
  }
  webpush.setVapidDetails("mailto:bestuur@voc-veendam.nl", publicKey, privateKey);

  const supabase = createAdminClient();
  const { data: pending, error } = await supabase.rpc("get_pending_push_notifications", { p_limit: limit });
  if (error || !pending) {
    return { sent: 0 };
  }

  const templateCache = new Map<string, { title: string; body: string } | null>();
  async function renderPushContent(item: { type: string; title: string; body: string | null }) {
    const templateKey = NOTIFICATION_PUSH_TEMPLATE_KEYS[item.type];
    if (!templateKey) return { title: item.title, body: item.body ?? "" };

    if (!templateCache.has(templateKey)) {
      const { data } = await supabase.rpc("get_message_template", { p_key: templateKey });
      const row = data?.[0];
      templateCache.set(templateKey, row?.push_title && row.push_body ? { title: row.push_title, body: row.push_body } : null);
    }
    const template = templateCache.get(templateKey);
    if (!template) return { title: item.title, body: item.body ?? "" };

    const variables = { title: item.title, body: item.body ?? "" };
    return { title: renderTemplate(template.title, variables), body: renderTemplate(template.body, variables) };
  }

  // get_pending_push_notifications claimt elke rij al atomisch (pushed_at =
  // now()) op het moment van ophalen — mark_notifications_pushed hieronder
  // is dus alleen nog nodig als expliciete no-op-bevestiging voor rijen die
  // echt zijn afgehandeld. Bij een fout die niet op een ingetrokken
  // abonnement wijst (tijdelijk netwerkprobleem, 5xx bij de pushdienst), is
  // de claim zonder verdere actie blijvend: de rij bleef voorheen voor
  // altijd pushed_at≠null staan terwijl de push nooit is aangekomen. Zet de
  // claim dan expliciet terug (pushed_at = null) zodat de volgende
  // cron-tick het opnieuw probeert.
  let sent = 0;
  for (const item of pending) {
    try {
      const content = await renderPushContent(item);
      await webpush.sendNotification(
        { endpoint: item.endpoint, keys: { p256dh: item.p256dh, auth: item.auth } },
        JSON.stringify({
          title: content.title,
          body: content.body,
          link: item.link,
          notification_id: item.notification_id,
          // Notification-tag (sw.js): laat meerdere snel opeenvolgende
          // meldingen van hetzelfde type elkaar vervangen i.p.v. zich op te
          // stapelen in het systeemmeldingencentrum.
          type: item.type,
        })
      );
      sent += 1;
    } catch (cause) {
      const statusCode = (cause as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        // Abonnement is echt ingetrokken/verlopen — dit zal nooit meer
        // lukken, dus de claim blijft staan (geen eindeloze retries op een
        // dood abonnement).
        await logPushUnsubscribed(item.endpoint, item.profile_id, supabase);
      } else {
        await supabase.from("notifications").update({ pushed_at: null }).eq("id", item.notification_id);
      }
    }
  }

  return { sent };
}
