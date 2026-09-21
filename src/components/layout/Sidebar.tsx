"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { DESKTOP_NAV_ITEMS, isNavItemActive, type NavItem } from "./nav-items";
import { NavBadge } from "./NavBadge";
import { Logo } from "@/components/ui/Logo";
import { SidebarProfileMenu } from "./ProfileMenu";
import { NetworkChooser } from "./NetworkChooser";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { VocSocialLinks } from "@/components/ui/VocSocialLinks";
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
      <div className="mb-8 flex items-center justify-between px-2">
        <Logo />
        <SearchOverlay variant="sidebar" />
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {DESKTOP_NAV_ITEMS.map((item) => {
          if (item.label === "Notificaties") {
            // Popover i.p.v. directe navigatie: een snelle blik zonder de
            // huidige pagina te verlaten (/notificaties blijft gewoon
            // bereikbaar via "Alles bekijken" in het paneel).
            return <NotificationCenter key={item.href} count={unread.total} variant="sidebar" />;
          }
          if (item.label === "Netwerk") {
            // Klik opent een popover (Leden/Bedrijven) net als het
            // accountmenu, i.p.v. een altijd-uitgeklapt submenu.
            return <NetworkChooser key={item.href} badgeCount={unread.netwerk} variant="sidebar" />;
          }
          return renderItem(item);
        })}
      </nav>

      <div className="flex items-center justify-center gap-2 py-3">
        <VocSocialLinks />
      </div>

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
