"use client";

import { Logo } from "@/components/ui/Logo";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { HamburgerMenu } from "./HamburgerMenu";
import type { UnreadNotificationSections } from "@/lib/notifications/useUnreadCount";

// Het profielicoon staat niet meer hier maar als vijfde item in de
// bottom-nav (BottomNav.tsx) — dus zoeken, notificaties en de
// hamburgerknop (algemeen "Menu", zie HamburgerMenu) resten rechtsboven.
export function MobileHeader({
  unread,
  logoUrl,
  siteName,
  showTestfase,
}: {
  unread: UnreadNotificationSections;
  logoUrl: string | null;
  siteName: string;
  showTestfase: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-1.5">
          <Logo logoUrl={logoUrl} siteName={siteName} />
        </div>
        <div className="flex items-center gap-1">
          <SearchOverlay variant="mobile" />
          <NotificationCenter count={unread.total} variant="mobile" />
          <HamburgerMenu showTestfase={showTestfase} />
        </div>
      </div>
      {/* Identiteit Fase 2: petrol->rood verloop i.p.v. de vlakke
          border-border-rand onder de kopbalk. */}
      <div aria-hidden className="gradient-rule" />
    </header>
  );
}
