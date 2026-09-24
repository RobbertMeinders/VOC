import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email/send";

// Mirror van /api/cron/send-push — zelfde CRON_SECRET-patroon, zelfde
// pending/mark-afhandeling, nu voor het e-mailkanaal
// (get_pending_email_notifications / mark_notifications_emailed,
// 0038_email_notification_preferences.sql).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: pending, error } = await supabase.rpc("get_pending_email_notifications", { p_limit: 50 });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const emailedIds: string[] = [];
  for (const item of pending ?? []) {
    const result = await sendNotificationEmail(item.email, {
      type: item.type,
      title: item.title,
      body: item.body,
      link: item.link,
    });
    if (result.providerId) {
      // Resend's eigen send-id, nodig om een latere open-webhook
      // (/api/webhooks/resend, Fase F) aan deze rij te koppelen.
      await supabase.rpc("set_notification_email_provider_id", {
        p_notification_id: item.notification_id,
        p_provider_id: result.providerId,
      });
    }
    emailedIds.push(item.notification_id);
  }

  if (emailedIds.length > 0) {
    await supabase.rpc("mark_notifications_emailed", { p_ids: emailedIds });
  }

  return NextResponse.json({ sent: emailedIds.length });
}
