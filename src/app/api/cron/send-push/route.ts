import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
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

// Hit periodically by Vercel Cron (see vercel.json) — actually delivering a
// web push means calling the push service's HTTP endpoint, which can't be
// done from inside a Postgres trigger, so every notification (however it
// was created — a DB trigger, an RPC, a server action) waits here until
// this job picks it up and marks it pushed.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "VAPID keys are not configured" }, { status: 500 });
  }
  webpush.setVapidDetails("mailto:bestuur@voc-veendam.nl", publicKey, privateKey);

  const supabase = await createClient();
  const { data: pending, error } = await supabase.rpc("get_pending_push_notifications", { p_limit: 50 });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Templates per type hergebruiken i.p.v. voor elke pending notificatie
  // opnieuw op te zoeken — meerdere pending rijen delen vaak hetzelfde type.
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
  for (const item of pending ?? []) {
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
        // The subscription is gone (browser data cleared, permission
        // revoked, …) — remove it so we stop trying, and log it for the
        // "opgezegde pushabonnementen"-statistiek.
        await logPushUnsubscribed(item.endpoint, item.profile_id);
      }
    }
    pushedIds.push(item.notification_id);
  }

  if (pushedIds.length > 0) {
    await supabase.rpc("mark_notifications_pushed", { p_ids: pushedIds });
  }

  return NextResponse.json({ sent: pushedIds.length });
}
