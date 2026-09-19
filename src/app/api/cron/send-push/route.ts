import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

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

  const pushedIds: string[] = [];
  for (const item of pending ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: item.endpoint, keys: { p256dh: item.p256dh, auth: item.auth } },
        JSON.stringify({ title: item.title, body: item.body, link: item.link })
      );
    } catch (cause) {
      const statusCode = (cause as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        // The subscription is gone (browser data cleared, permission
        // revoked, …) — remove it so we stop trying.
        await supabase.from("push_subscriptions").delete().eq("endpoint", item.endpoint);
      }
    }
    pushedIds.push(item.notification_id);
  }

  if (pushedIds.length > 0) {
    await supabase.rpc("mark_notifications_pushed", { p_ids: pushedIds });
  }

  return NextResponse.json({ sent: pushedIds.length });
}
