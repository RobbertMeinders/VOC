import type { ReactNode } from "react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { count: unreadNotifications } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id)
    .eq("is_read", false);

  return (
    <AppShell profile={profile} unreadNotifications={unreadNotifications ?? 0}>
      {children}
    </AppShell>
  );
}
