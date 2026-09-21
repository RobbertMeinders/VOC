"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { NotificationBellIcon } from "@/components/notifications/NotificationBellIcon";
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
          <Link
            href="/zoeken"
            aria-label="Zoeken"
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.08]"
          >
            <Search size={18} />
          </Link>
          <NotificationBellIcon count={unread.total} />
          <HeaderProfileMenu profile={profile} avatarUrl={avatarUrl} companyId={companyId} beheerBadge={unread.beheer} />
        </div>
      </div>
    </header>
  );
}
