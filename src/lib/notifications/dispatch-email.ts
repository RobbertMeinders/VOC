import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationEmail } from "@/lib/email/send";

// UX-review punt 2: mirror van dispatch-push.ts, zelfde reden — cron blijft
// vangnet, een directe aanroep kan hetzelfde pad nu ook meteen na de actie
// gebruiken. SMTP-verzending is latentiegevoeliger dan web push, dus deze
// wordt alleen via next/server's after() aangeroepen (blokkeert de respons
// niet) en bewust niet overal waar dispatchPendingPushNotifications wel
// wordt aangeroepen — de cron blijft hier het primaire vangnet.
export async function dispatchPendingEmailNotifications(limit = 50): Promise<{ sent: number }> {
  const supabase = createAdminClient();
  const { data: pending, error } = await supabase.rpc("get_pending_email_notifications", { p_limit: limit });
  if (error || !pending) {
    return { sent: 0 };
  }

  const emailedIds: string[] = [];
  for (const item of pending) {
    const result = await sendNotificationEmail(item.email, {
      type: item.type,
      title: item.title,
      body: item.body,
      link: item.link,
    });
    if (result.providerId) {
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

  return { sent: emailedIds.length };
}
