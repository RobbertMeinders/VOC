import "server-only";

import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderTemplate } from "@/lib/template/render";
import { logPushUnsubscribed } from "@/lib/events/log";

// Notificatietypes met een beheerbaar push_templates-record (0039_
// notification_templates.sql) — mirror van NOTIFICATION_EMAIL_TEMPLATE_KEYS
// (src/lib/email/send.ts). Overige types gaan altijd met de rauwe
// titel/body van de notificatie zelf.
const NOTIFICATION_PUSH_TEMPLATE_KEYS: Record<string, string> = {
  new_activity: "nieuwe_activiteit",
  new_member: "nieuw_lid",
  feed_comment: "feed_reactie",
  feed_mention: "feed_vermelding",
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
      const { data } = await supabase.rpc("get_push_template", { p_key: templateKey });
      templateCache.set(templateKey, data?.[0] ?? null);
    }
    const template = templateCache.get(templateKey);
    if (!template) return { title: item.title, body: item.body ?? "" };

    const variables = { title: item.title, body: item.body ?? "" };
    return { title: renderTemplate(template.title, variables), body: renderTemplate(template.body, variables) };
  }

  const pushedIds: string[] = [];
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
        })
      );
    } catch (cause) {
      const statusCode = (cause as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await logPushUnsubscribed(item.endpoint, item.profile_id, supabase);
      }
    }
    pushedIds.push(item.notification_id);
  }

  if (pushedIds.length > 0) {
    await supabase.rpc("mark_notifications_pushed", { p_ids: pushedIds });
  }

  return { sent: pushedIds.length };
}
