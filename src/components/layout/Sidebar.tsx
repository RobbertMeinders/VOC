"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { DESKTOP_NAV_ITEMS, LEDEN_NAV_ITEM, BEDRIJVEN_NAV_ITEM, isNavItemActive, type NavItem } from "./nav-items";
import { NavBadge } from "./NavBadge";
import { Logo } from "@/components/ui/Logo";
import { SidebarProfileMenu } from "./ProfileMenu";
import type { Profile } from "@/lib/auth/session";
import type { UnreadNotificationSections } from "@/lib/notifications/useUnreadCount";

export function Sidebar({
  profile,
  unread,
  avatarUrl,
  companyId,
  companyName,
}: {
  profile: Profile;
  unread: UnreadNotificationSections;
  avatarUrl: string | null;
  companyId: string | null;
  companyName: string | null;
}) {
  const pathname = usePathname();

  function renderItem(item: NavItem, indented = false) {
    const { href, label, icon: Icon, badgeKey } = item;
    const active = isNavItemActive(item, pathname);
    return (
      <Link
        key={href}
        href={href}
        className={clsx(
          "flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors",
          indented ? "px-3 pl-10" : "px-3",
          active ? "bg-voc-red-light text-voc-red" : "text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
        )}
      >
        <Icon size={indented ? 16 : 20} strokeWidth={active ? 2.5 : 2} />
        {label}
        {badgeKey && (
          <span className="ml-auto">
            <NavBadge count={unread[badgeKey]} />
          </span>
        )}
      </Link>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-surface px-4 py-6 md:flex">
      <div className="mb-8 px-2">
        <Logo />
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {DESKTOP_NAV_ITEMS.map((item) => {
          if (item.label !== "Netwerk") return renderItem(item);
          // Netwerk is de enige sidebar-ingang die op desktop uitklapt: de
          // subitems staan altijd zichtbaar (geen collapse-state nodig),
          // zodat meteen duidelijk is dat "Netwerk" uit Leden + Bedrijven
          // bestaat i.p.v. een los klikbaar item te zijn.
          return (
            <div key="netwerk-group">
              {renderItem(item)}
              <div className="flex flex-col gap-1">
                {renderItem(LEDEN_NAV_ITEM, true)}
                {renderItem(BEDRIJVEN_NAV_ITEM, true)}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border pt-4">
        <SidebarProfileMenu
          profile={profile}
          avatarUrl={avatarUrl}
          companyId={companyId}
          companyName={companyName}
          beheerBadge={unread.beheer}
        />
      </div>
    </aside>
  );
}
