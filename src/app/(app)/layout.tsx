import type { ReactNode } from "react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { getAppSettings } from "@/lib/settings/app-settings";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: unreadNotifications }, avatarUrl, { data: membership }, settings] = await Promise.all([
    // type 'newsletter' uitsluiten: die rijen zijn puur verzendadministratie
    // voor de nieuwsbrief (zie 0067_newsletter_send.sql) — een lid leest de
    // inhoud al via e-mail, dus geen extra bel-badge zonder bruikbare link.
    supabase
      .from("notifications")
      .select("id, link")
      .eq("profile_id", profile.id)
      .eq("is_read", false)
      .neq("type", "newsletter"),
    getSignedStorageUrl("avatars", profile.avatar_url),
    supabase
      .from("company_members")
      .select("company_id, company:companies(name)")
      .eq("profile_id", profile.id)
      .limit(1)
      .maybeSingle()
      .returns<{ company_id: string; company: { name: string } | null }>(),
    getAppSettings(),
  ]);

  return (
    <AppShell
      profile={profile}
      unreadNotifications={unreadNotifications ?? []}
      avatarUrl={avatarUrl}
      companyId={membership?.company_id ?? null}
      companyName={membership?.company?.name ?? null}
      logoUrl={settings.logo_url}
      siteName={settings.site_name}
      modal={modal}
    >
      {children}
    </AppShell>
  );
}
