"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { LayoutDashboard } from "lucide-react";
import { SIDEBAR_NAV_ITEMS } from "./nav-items";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { LogoutButton } from "./LogoutButton";
import { NotificationBellLink } from "@/components/notifications/NotificationBellLink";
import { isBoard, ROLE_LABELS } from "@/lib/auth/roles";
import type { Profile } from "@/lib/auth/session";

export function Sidebar({
  profile,
  unreadCount,
  avatarUrl,
}: {
  profile: Profile;
  unreadCount: number;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-surface px-4 py-6 md:flex">
      <div className="mb-8 px-2">
        <Logo />
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {SIDEBAR_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-voc-red-light text-voc-red"
                  : "text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}

        <NotificationBellLink count={unreadCount} />

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
        <Avatar firstName={profile.first_name} lastName={profile.last_name} avatarUrl={avatarUrl} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {profile.first_name} {profile.last_name}
          </p>
          <p className="truncate text-xs text-muted">{ROLE_LABELS[profile.role]}</p>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
