"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { MOBILE_PRIMARY_NAV_ITEMS, isNavItemActive } from "./nav-items";
import { NetworkChooser } from "./NetworkChooser";
import { MobileProfileMenu } from "./ProfileMenu";
import type { Profile } from "@/lib/auth/session";
import type { UnreadNotificationSections } from "@/lib/notifications/useUnreadCount";

export function BottomNav({
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
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Hoofdnavigatie"
    >
      <ul className="flex items-stretch justify-around">
        {MOBILE_PRIMARY_NAV_ITEMS.map((item) => {
          const { href, label, icon: Icon, badgeKey } = item;
          const count = badgeKey ? unread[badgeKey] : 0;

          if (item.label === "Netwerk") {
            return (
              <li key={href} className="flex-1">
                <NetworkChooser badgeCount={count} />
              </li>
            );
          }

          const active = isNavItemActive(item, pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={clsx(
                  "relative flex h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium",
                  active ? "text-voc-red" : "text-muted"
                )}
              >
                <span className="relative">
                  <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                  {count > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-voc-red px-1 text-[10px] font-medium text-white">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <MobileProfileMenu profile={profile} avatarUrl={avatarUrl} companyId={companyId} beheerBadge={unread.beheer} />
        </li>
      </ul>
    </nav>
  );
}
