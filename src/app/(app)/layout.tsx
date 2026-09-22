import type { ReactNode } from "react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: unreadNotifications }, avatarUrl, { data: membership }] = await Promise.all([
    supabase.from("notifications").select("id, link").eq("profile_id", profile.id).eq("is_read", false),
    getSignedStorageUrl("avatars", profile.avatar_url),
    supabase
      .from("company_members")
      .select("company_id, company:companies(name)")
      .eq("profile_id", profile.id)
      .limit(1)
      .maybeSingle()
      .returns<{ company_id: string; company: { name: string } | null }>(),
  ]);

  return (
    <AppShell
      profile={profile}
      unreadNotifications={unreadNotifications ?? []}
      avatarUrl={avatarUrl}
      companyId={membership?.company_id ?? null}
      companyName={membership?.company?.name ?? null}
      modal={modal}
    >
      {children}
    </AppShell>
  );
}
