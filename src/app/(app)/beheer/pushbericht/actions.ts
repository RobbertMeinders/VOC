"use server";

import webpush from "web-push";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type PushBroadcastState = { error?: string; sent?: number; total?: number };

// Los van de automatische notificaties (nieuwe activiteit, nieuw lid, …):
// bestuur/beheer stuurt hier zelf, direct, één pushbericht naar alle
// actieve abonnementen — geen enkele per-type voorkeur (push_new_activity/
// -activity_reminder/-feed_comment/-feed_mention/-new_members) filtert dit
// weg, net als de andere altijd-aan operationele
// meldingen. Per bereikt abonnement komt er, net als bij een automatische
// push, één notifications-rij bij (type "manual_broadcast", meteen
// pushed_at gezet) zodat handmatige en automatische pushes op dezelfde
// manier meetellen in de statistieken (Fase E).
export async function sendPushBroadcastAction(
  _prevState: PushBroadcastState,
  formData: FormData
): Promise<PushBroadcastState> {
  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  if (!title || !message) {
    return { error: "Titel en bericht zijn verplicht." };
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return { error: "Pushmeldingen zijn niet geconfigureerd (VAPID-sleutels ontbreken)." };
  }
  webpush.setVapidDetails("mailto:bestuur@voc-veendam.nl", publicKey, privateKey);

  const supabase = await createClient();
  // Rechtstreeks .from("push_subscriptions") levert onder RLS alleen je
  // eigen abonnement op (push_subscriptions_self_select) — deze RPC is
  // security definer en checkt zelf is_board(), zie 0041_manual_push_
  // broadcast.sql.
  const { data: subscriptions, error } = await supabase.rpc("list_push_subscriptions");

  if (error) {
    return { error: "Ophalen van pushabonnementen is niet gelukt." };
  }

  const reachedProfileIds: string[] = [];
  const deadEndpoints: string[] = [];
  for (const sub of subscriptions ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body: message })
      );
      reachedProfileIds.push(sub.profile_id);
    } catch (cause) {
      const statusCode = (cause as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        deadEndpoints.push(sub.endpoint);
      }
    }
  }

  // Eén lid kan meerdere apparaten/abonnementen hebben; dedupen vóór het
  // doorgeven voorkomt dubbele notifications-rijen voor hetzelfde lid (de
  // RPC zelf dedupet ook, zie 0196, maar dit telt "sent" meteen correct).
  const uniqueReachedProfileIds = [...new Set(reachedProfileIds)];
  // "total" moet in dezelfde eenheid tellen als "sent" (leden, niet losse
  // abonnementen) — anders klopt bv. "1 van 4" niet meer zodra een lid met
  // 2 apparaten meetelt als 2 in total maar maar 1x in sent.
  const uniqueTotalProfileIds = new Set((subscriptions ?? []).map((s) => s.profile_id)).size;

  await supabase.rpc("record_manual_push_broadcast", {
    p_reached_profile_ids: uniqueReachedProfileIds,
    p_dead_endpoints: deadEndpoints,
    p_title: title,
    p_body: message,
  });

  return { sent: uniqueReachedProfileIds.length, total: uniqueTotalProfileIds };
}
