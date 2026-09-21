import type { ReactNode } from "react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ count: unreadNotifications }, avatarUrl] = await Promise.all([
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id)
      .eq("is_read", false),
    getSignedStorageUrl("avatars", profile.avatar_url),
  ]);

  return (
    <AppShell profile={profile} unreadNotifications={unreadNotifications ?? 0} avatarUrl={avatarUrl}>
      {children}
    </AppShell>
  );
}
