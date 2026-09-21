"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { LayoutDashboard } from "lucide-react";
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS, isNavItemActive, type NavItem } from "./nav-items";
import { Logo } from "@/components/ui/Logo";
import { LogoutButton } from "./LogoutButton";
import { SidebarProfileMenu } from "./ProfileMenu";
import { NotificationBellLink } from "@/components/notifications/NotificationBellLink";
import { isBoard } from "@/lib/auth/roles";
import type { Profile } from "@/lib/auth/session";

export function Sidebar({
  profile,
  unreadCount,
  avatarUrl,
  companyId,
}: {
  profile: Profile;
  unreadCount: number;
  avatarUrl: string | null;
  companyId: string | null;
}) {
  const pathname = usePathname();

  function renderItem(item: NavItem) {
    const { href, label, icon: Icon } = item;
    const active = isNavItemActive(item, pathname);
    return (
      <Link
        key={href}
        href={href}
        className={clsx(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          active ? "bg-voc-red-light text-voc-red" : "text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
        )}
      >
        <Icon size={20} strokeWidth={active ? 2.5 : 2} />
        {label}
      </Link>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-surface px-4 py-6 md:flex">
      <div className="mb-8 px-2">
        <Logo />
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {PRIMARY_NAV_ITEMS.map(renderItem)}

        <p className="mb-1 mt-3 px-3 text-xs font-semibold uppercase tracking-wide text-muted">Meer</p>
        {SECONDARY_NAV_ITEMS.map(renderItem)}

        <div className="mt-3 border-t border-border pt-3">
          <NotificationBellLink count={unreadCount} />
        </div>

        {isBoard(profile.role) && (
          <Link
            href="/beheer"
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname.startsWith("/beheer")
                ? "bg-voc-red-light text-voc-red"
                : "text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
            )}
          >
            <LayoutDashboard size={20} strokeWidth={pathname.startsWith("/beheer") ? 2.5 : 2} />
            Beheer
          </Link>
        )}
      </nav>

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <SidebarProfileMenu profile={profile} avatarUrl={avatarUrl} companyId={companyId} />
        <LogoutButton />
      </div>
    </aside>
  );
}
