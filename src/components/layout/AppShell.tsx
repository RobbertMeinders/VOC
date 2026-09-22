"use client";

import type { ReactNode } from "react";
import type { Profile } from "@/lib/auth/session";
import { useUnreadNotificationCount, type UnreadNotification } from "@/lib/notifications/useUnreadCount";
import { OverlayProvider } from "@/lib/ui/OverlayContext";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { MobileHeader } from "./MobileHeader";
import { OnlineHeartbeat } from "./OnlineHeartbeat";

export function AppShell({
  profile,
  unreadNotifications,
  avatarUrl,
  companyId,
  companyName,
  children,
  modal,
}: {
  profile: Profile;
  unreadNotifications: UnreadNotification[];
  avatarUrl: string | null;
  companyId: string | null;
  companyName: string | null;
  children: ReactNode;
  modal?: ReactNode;
}) {
  // Eén realtime-subscription hier, en de aantallen als prop doorgeven aan de
  // sidebar- en mobiele-header-bel: allebei staan ze altijd in de DOM (alleen
  // via CSS verborgen), dus elk zijn eigen subscription zou een tweede
  // .on()-aanroep doen op hetzelfde, al ge-subscribede Supabase-kanaal.
  const unread = useUnreadNotificationCount(profile.id, unreadNotifications);

  return (
    <OverlayProvider>
      <div className="min-h-dvh bg-background">
        <OnlineHeartbeat />
        <Sidebar profile={profile} unread={unread} avatarUrl={avatarUrl} companyId={companyId} companyName={companyName} />
        <MobileHeader unread={unread} />
        <main className="pb-20 md:ml-64 md:pb-0">
          <div className="mx-auto w-full max-w-2xl px-4 py-6 md:max-w-6xl md:px-8 md:py-10">{children}</div>
        </main>
        <BottomNav profile={profile} avatarUrl={avatarUrl} companyId={companyId} unread={unread} />
        {modal}
      </div>
    </OverlayProvider>
  );
}
