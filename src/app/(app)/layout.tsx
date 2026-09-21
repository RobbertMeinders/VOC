import type { ReactNode } from "react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: unreadNotifications }, avatarUrl, { data: membership }] = await Promise.all([
    supabase.from("notifications").select("id, link").eq("profile_id", profile.id).eq("is_read", false),
    getSignedStorageUrl("avatars", profile.avatar_url),
    supabase.from("company_members").select("company_id").eq("profile_id", profile.id).limit(1).maybeSingle(),
  ]);

  return (
    <AppShell
      profile={profile}
      unreadNotifications={unreadNotifications ?? []}
      avatarUrl={avatarUrl}
      companyId={membership?.company_id ?? null}
    >
      {children}
    </AppShell>
  );
}
