"use client";

import type { ReactNode } from "react";
import { clsx } from "clsx";
import type { Profile } from "@/lib/auth/session";
import {
  MarkNotificationReadProvider,
  useUnreadNotificationCount,
  type UnreadNotification,
  type UnreadNotificationSections,
} from "@/lib/notifications/useUnreadCount";
import { OverlayProvider } from "@/lib/ui/OverlayContext";
import { OverlayOriginProvider } from "@/lib/ui/OverlayOriginContext";
import { PageWidthProvider, usePageWidth } from "@/lib/ui/PageWidthContext";
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
  const { sections: unread, markRead } = useUnreadNotificationCount(profile.id, unreadNotifications);

  return (
    <OverlayProvider>
      <OverlayOriginProvider>
        <MarkNotificationReadProvider value={markRead}>
          <PageWidthProvider>
            <AppShellBody
              profile={profile}
              unread={unread}
              avatarUrl={avatarUrl}
              companyId={companyId}
              companyName={companyName}
              modal={modal}
            >
              {children}
            </AppShellBody>
          </PageWidthProvider>
        </MarkNotificationReadProvider>
      </OverlayOriginProvider>
    </OverlayProvider>
  );
}

function AppShellBody({
  profile,
  unread,
  avatarUrl,
  companyId,
  companyName,
  children,
  modal,
}: {
  profile: Profile;
  unread: UnreadNotificationSections;
  avatarUrl: string | null;
  companyId: string | null;
  companyName: string | null;
  children: ReactNode;
  modal?: ReactNode;
}) {
  // Standaard max-w-6xl, maar een pagina kan via <FullWidthPage /> (ergens
  // in zijn eigen boom) die begrenzing loslaten — bedoeld voor
  // contentzware editors (zoals de nieuwsbriefeditor) die anders te krap
  // staan.
  const { wide } = usePageWidth();

  return (
    <div className="min-h-dvh bg-background">
      <OnlineHeartbeat />
      <Sidebar profile={profile} unread={unread} avatarUrl={avatarUrl} companyId={companyId} companyName={companyName} />
      <MobileHeader unread={unread} />
      <main className="pb-20 md:ml-72 md:pb-0">
        <div
          className={clsx(
            "mx-auto w-full px-4 py-6 md:px-8 md:py-10",
            wide ? "max-w-[1600px]" : "max-w-2xl md:max-w-6xl"
          )}
        >
          {children}
        </div>
      </main>
      <BottomNav profile={profile} avatarUrl={avatarUrl} companyId={companyId} unread={unread} />
      {modal}
    </div>
  );
}
