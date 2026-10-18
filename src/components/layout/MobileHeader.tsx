"use client";

import { Logo } from "@/components/ui/Logo";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { VerenigingMenu } from "./VerenigingMenu";
import type { UnreadNotificationSections } from "@/lib/notifications/useUnreadCount";

// Het profielicoon staat niet meer hier maar als vijfde item in de
// bottom-nav (BottomNav.tsx) — dus zoeken, notificaties en de
// Vereniging-hamburgerknop (VOC Hub — Beheeromgeving-opdracht, punt 8)
// resten rechtsboven.
export function MobileHeader({
  unread,
  logoUrl,
  siteName,
}: {
  unread: UnreadNotificationSections;
  logoUrl: string | null;
  siteName: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Logo logoUrl={logoUrl} siteName={siteName} />
        <div className="flex items-center gap-1">
          <SearchOverlay variant="mobile" />
          <NotificationCenter count={unread.total} variant="mobile" />
          <VerenigingMenu variant="mobile" />
        </div>
      </div>
    </header>
  );
}
