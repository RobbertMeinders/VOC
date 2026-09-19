"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

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
