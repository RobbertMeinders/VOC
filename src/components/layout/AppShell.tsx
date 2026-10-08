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
import { ConfirmDialogProvider } from "@/lib/ui/ConfirmDialogContext";
import { ToastProvider } from "@/lib/ui/ToastContext";
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
            <ConfirmDialogProvider>
              <ToastProvider>
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
              </ToastProvider>
            </ConfirmDialogProvider>
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
    // UX-review punt 6: vangnet tegen een gemiste overflow-bug elders die de
    // hele pagina breder dan het scherm maakt — dat liet op mobiel eerder de
    // (fixed) bottom-nav mee opschuiven/gedeeltelijk uit beeld vallen.
    <div className="min-h-dvh overflow-x-hidden bg-background">
      {/* UX-review Q5: geen "naar inhoud"-link, dus een toetsenbordgebruiker
          moest eerst door de volledige sidebar/navigatie tabben voor elke
          paginawissel. sr-only tot 'ie focus krijgt (eerste tab-stop in de
          DOM) — gewoon :focus i.p.v. :focus-visible, zoals bij skip-links
          gebruikelijk is, zodat 'ie ook verschijnt als iemand 'm per ongeluk
          aanklikt. main hieronder krijgt tabIndex={-1}: zonder dat verplaatst
          de browser alleen de scrollpositie, niet de focus zelf, waardoor
          verder tabben weer bij de sidebar begint i.p.v. bij de inhoud. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-voc-red focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Naar inhoud
      </a>
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
      <main id="main-content" tabIndex={-1} className="pb-20 focus:outline-none md:ml-72 md:pb-0">
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
