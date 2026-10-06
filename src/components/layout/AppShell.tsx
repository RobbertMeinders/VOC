"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
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
import { UnsavedChangesProvider } from "@/lib/ui/UnsavedChangesContext";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { MobileHeader } from "./MobileHeader";
import { OnlineHeartbeat } from "./OnlineHeartbeat";
import { ScrollLockGuard } from "./ScrollLockGuard";

export function AppShell({
  profile,
  unreadNotifications,
  avatarUrl,
  companyId,
  companyName,
  logoUrl,
  siteName,
  children,
  modal,
}: {
  profile: Profile;
  unreadNotifications: UnreadNotification[];
  avatarUrl: string | null;
  companyId: string | null;
  companyName: string | null;
  logoUrl: string | null;
  siteName: string;
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
          <UnsavedChangesProvider>
            <AppShellBody
              profile={profile}
              unread={unread}
              avatarUrl={avatarUrl}
              companyId={companyId}
              companyName={companyName}
              logoUrl={logoUrl}
              siteName={siteName}
              modal={modal}
            >
              {children}
            </AppShellBody>
          </UnsavedChangesProvider>
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
  logoUrl,
  siteName,
  children,
  modal,
}: {
  profile: Profile;
  unread: UnreadNotificationSections;
  avatarUrl: string | null;
  companyId: string | null;
  companyName: string | null;
  logoUrl: string | null;
  siteName: string;
  children: ReactNode;
  modal?: ReactNode;
}) {
  // Beheer-pagina's laten de standaard gecentreerde max-w-6xl los: met
  // mx-auto bleef er op een breed scherm namelijk een leeg stuk over tussen
  // de hoofdsidebar en het Beheer-zijmenu (het centreert binnen de
  // resterende ruimte), waardoor dat menu niet overal consistent vlak
  // tegen de hoofdnavigatie aan stond. Rechtstreeks op de pathname bepaald
  // (i.p.v. via een losse context + useEffect die pas ná de eerste render
  // "breed" zet) zodat er geen zichtbare sprong van gecentreerd naar links
  // optreedt bij het laden van de pagina.
  const pathname = usePathname();
  const wide = pathname.startsWith("/beheer");

  return (
    <div className="min-h-dvh bg-background">
      <OnlineHeartbeat />
      <ScrollLockGuard />
      <Sidebar
        profile={profile}
        unread={unread}
        avatarUrl={avatarUrl}
        companyId={companyId}
        companyName={companyName}
        logoUrl={logoUrl}
        siteName={siteName}
      />
      <MobileHeader unread={unread} logoUrl={logoUrl} siteName={siteName} />
      <main className="pb-20 md:ml-72 md:pb-0">
        <div
          className={clsx(
            "w-full px-4 py-6",
            wide ? "md:px-16 md:py-10" : "mx-auto max-w-2xl md:max-w-6xl md:px-8 md:py-10"
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
