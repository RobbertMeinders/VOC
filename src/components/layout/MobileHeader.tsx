"use client";

import { Logo } from "@/components/ui/Logo";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { HeaderProfileMenu } from "./ProfileMenu";
import type { Profile } from "@/lib/auth/session";
import type { UnreadNotificationSections } from "@/lib/notifications/useUnreadCount";

export function MobileHeader({
  profile,
  avatarUrl,
  companyId,
  unread,
}: {
  profile: Profile;
  avatarUrl: string | null;
  companyId: string | null;
  unread: UnreadNotificationSections;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-1">
          <SearchOverlay variant="mobile" />
          <NotificationCenter count={unread.total} variant="mobile" />
          <HeaderProfileMenu profile={profile} avatarUrl={avatarUrl} companyId={companyId} beheerBadge={unread.beheer} />
        </div>
      </div>
    </header>
  );
}
