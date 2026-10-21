"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import type { Profile } from "@/lib/auth/session";
import {
  MarkAllNotificationsReadProvider,
  MarkNotificationReadProvider,
  MarkSectionReadProvider,
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
  companySlug,
  companyName,
  logoUrl,
  siteName,
  showTestfase,
  beheerWaitingCount,
  children,
  modal,
}: {
  profile: Profile;
  unreadNotifications: UnreadNotification[];
  avatarUrl: string | null;
  companySlug: string | null;
  companyName: string | null;
  logoUrl: string | null;
  siteName: string;
  showTestfase: boolean;
  beheerWaitingCount: number;
  children: ReactNode;
  modal?: ReactNode;
}) {
  // Eén realtime-subscription hier, en de aantallen als prop doorgeven aan de
  // sidebar- en mobiele-header-bel: allebei staan ze altijd in de DOM (alleen
  // via CSS verborgen), dus elk zijn eigen subscription zou een tweede
  // .on()-aanroep doen op hetzelfde, al ge-subscribede Supabase-kanaal.
  const { sections: unread, markRead, markAllRead, markSectionRead } = useUnreadNotificationCount(
    profile.id,
    unreadNotifications
  );

  return (
    <OverlayProvider>
      <OverlayOriginProvider>
        <MarkNotificationReadProvider value={markRead}>
          <MarkAllNotificationsReadProvider value={markAllRead}>
            <MarkSectionReadProvider value={markSectionRead}>
              <UnsavedChangesProvider>
                <ConfirmDialogProvider>
                  <ToastProvider>
                    <AppShellBody
                      profile={profile}
                      unread={unread}
                      avatarUrl={avatarUrl}
                      companySlug={companySlug}
                      companyName={companyName}
                      logoUrl={logoUrl}
                      siteName={siteName}
                      showTestfase={showTestfase}
                      beheerWaitingCount={beheerWaitingCount}
                      modal={modal}
                    >
                      {children}
                    </AppShellBody>
                  </ToastProvider>
                </ConfirmDialogProvider>
              </UnsavedChangesProvider>
            </MarkSectionReadProvider>
          </MarkAllNotificationsReadProvider>
        </MarkNotificationReadProvider>
      </OverlayOriginProvider>
    </OverlayProvider>
  );
}

function AppShellBody({
  profile,
  unread,
  avatarUrl,
  companySlug,
  companyName,
  logoUrl,
  siteName,
  showTestfase,
  beheerWaitingCount,
  children,
  modal,
}: {
  profile: Profile;
  unread: UnreadNotificationSections;
  avatarUrl: string | null;
  companySlug: string | null;
  companyName: string | null;
  logoUrl: string | null;
  siteName: string;
  showTestfase: boolean;
  beheerWaitingCount: number;
  children: ReactNode;
  modal?: ReactNode;
}) {
  // Beheer-pagina's laten de standaard gecentreerde breedte los: met
  // mx-auto bleef er op een breed scherm namelijk een leeg stuk over tussen
  // de hoofdsidebar en het Beheer-zijmenu (het centreert binnen de
  // resterende ruimte), waardoor dat menu niet overal consistent vlak
  // tegen de hoofdnavigatie aan stond. Rechtstreeks op de pathname bepaald
  // (i.p.v. via een losse context + useEffect die pas ná de eerste render
  // "breed" zet) zodat er geen zichtbare sprong van gecentreerd naar links
  // optreedt bij het laden van de pagina.
  //
  // Afwerkronde (desktopbreedtes): elke pagina had tot nu toe zijn eigen,
  // ad-hoc binnenste max-w-wrapper (of geen), met als gevolg dat Nieuws,
  // Community en Agenda alledrie een andere breedte hadden. Drie vaste
  // maten, hier op één plek bepaald i.p.v. per pagina een eigen wrapper:
  // "lezen" (720px, één kolom doorlopende tekst — nieuwsbericht, profiel,
  // privacy, activiteitdetail), "lijst" (960px — agenda, community,
  // documenten, meldingen, nieuwsoverzicht, instellingen) en "breed"
  // (onveranderd de volle max-w-6xl-kolom — netwerk, beheer, en elke
  // pagina die hier niet expliciet in staat).
  const pathname = usePathname();
  const wide = pathname.startsWith("/beheer");
  const contentWidth = (() => {
    // /agenda/[id], /leden/[id] en /bedrijven/[id] zijn @modal-intercepted
    // routes (RouteOverlayPanel): bij een soft-nav naar zo'n detailpagina
    // blijft `children` hier gewoon de LIJST erachter tonen (Next rendert
    // het detail apart in de `modal`-parallel-slot) — alleen bij een hard
    // load/deep link (geen matchende @modal-intercept, dus modal is dan
    // leeg) bevat children écht de volle detailpagina en klopt "lezen".
    // Zonder deze modal-check werd de lijst-children bij elke soft-nav naar
    // zo'n detailpagina ten onrechte naar 720px geperst (normaal onzichtbaar
    // achter de fixed overlay, maar wel zichtbaar zodra die overlay om een
    // andere reden niet rendert).
    if (/^\/agenda\/[^/]+/.test(pathname)) return modal ? "lijst" : "lezen";
    if (/^\/(leden|bedrijven)\/[^/]+/.test(pathname)) return modal ? "breed" : "lezen";
    if (pathname === "/privacy" || pathname.startsWith("/nieuws/")) return "lezen";
    if (["/agenda", "/community", "/documenten", "/notificaties", "/nieuws", "/instellingen"].includes(pathname)) return "lijst";
    return "breed";
  })();
  return (
    // UX-review punt 6: vangnet tegen een gemiste overflow-bug elders die de
    // hele pagina breder dan het scherm maakt — dat liet op mobiel eerder de
    // (fixed) bottom-nav mee opschuiven/gedeeltelijk uit beeld vallen. De
    // overflow-x-hidden zelf staat nu op body (globals.css) i.p.v. hier —
    // zie die toelichting voor waarom dat de sticky Beheer-submenu brak.
    <div className="min-h-dvh bg-background">
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
      {/* QA-feedback redesign: op /beheer vervangt de donkerpetrol
          beheerzijbalk (BeheerSidebar, in beheer/layout.tsx) de gewone
          Sidebar — niet ernaast. Die beheerzijbalk is zelf fixed en vult
          dezelfde linkerkolom (zie BeheerSidebar.tsx), dus main's
          md:ml-72 hieronder blijft ongewijzigd correct, met Sidebar of
          zonder. */}
      {!wide && (
        <Sidebar
          profile={profile}
          unread={unread}
          avatarUrl={avatarUrl}
          companySlug={companySlug}
          companyName={companyName}
          logoUrl={logoUrl}
          siteName={siteName}
          showTestfase={showTestfase}
          beheerWaitingCount={beheerWaitingCount}
        />
      )}
      <MobileHeader unread={unread} logoUrl={logoUrl} siteName={siteName} showTestfase={showTestfase} />
      <main id="main-content" tabIndex={-1} className="relative pb-20 focus:outline-none md:ml-72 md:pb-0">
        <div
          className={clsx(
            "relative w-full px-4 py-6",
            wide
              ? "md:px-16 md:py-10"
              : clsx(
                  "mx-auto max-w-2xl md:px-8 md:py-10",
                  contentWidth === "lezen" ? "md:max-w-[720px]" : contentWidth === "lijst" ? "md:max-w-[960px]" : "md:max-w-6xl"
                )
          )}
        >
          {children}
        </div>
      </main>
      <BottomNav
        profile={profile}
        avatarUrl={avatarUrl}
        companySlug={companySlug}
        companyName={companyName}
        unread={unread}
        showTestfase={showTestfase}
        beheerWaitingCount={beheerWaitingCount}
      />
      {modal}
    </div>
  );
}
