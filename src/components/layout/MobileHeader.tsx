"use client";

import { Logo } from "@/components/ui/Logo";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import type { UnreadNotificationSections } from "@/lib/notifications/useUnreadCount";

// Het profielicoon staat niet meer hier maar als vijfde item in de
// bottom-nav (BottomNav.tsx) — dus alleen zoeken en notificaties resten
// rechtsboven.
export function MobileHeader({ unread }: { unread: UnreadNotificationSections }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-1">
          <SearchOverlay variant="mobile" />
          <NotificationCenter count={unread.total} variant="mobile" />
        </div>
      </div>
    </header>
  );
}
