"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

export type RecentNotification = Database["public"]["Tables"]["notifications"]["Row"];

// Voor het notificatie-popover/drawer (NotificationCenter): een korte,
// on-demand lijst zodat je meldingen kunt bekijken zonder de huidige pagina
// te verlaten — los van de (realtime bijgehouden) ongelezen-tellers.
export async function getRecentNotificationsAction(limit = 8): Promise<RecentNotification[]> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<RecentNotification[]>();
  return data ?? [];
}

export async function markNotificationReadAction(notificationId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("profile_id", profile.id);
  revalidatePath("/notificaties");
}

export async function markAllNotificationsReadAction() {
  const profile = await requireProfile();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("profile_id", profile.id)
    .eq("is_read", false);
  revalidatePath("/notificaties");
}

export async function deleteNotificationAction(notificationId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  await supabase.from("notifications").delete().eq("id", notificationId).eq("profile_id", profile.id);
  revalidatePath("/notificaties");
}
