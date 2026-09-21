"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { LogoutButton } from "./LogoutButton";
import { NotificationBellIcon } from "@/components/notifications/NotificationBellIcon";
import { NavBadge } from "./NavBadge";
import { BEHEER_NAV_ITEM, SECONDARY_NAV_ITEMS } from "./nav-items";
import { isBoard, ROLE_LABELS } from "@/lib/auth/roles";
import type { Profile } from "@/lib/auth/session";
import type { UnreadNotificationSections } from "@/lib/notifications/useUnreadCount";

export function MobileHeader({ profile, unread }: { profile: Profile; unread: UnreadNotificationSections }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-1">
          <NotificationBellIcon count={unread.total} />
          {/* Keyed by pathname so the panel remounts (and its open state
              resets to closed) on every navigation, instead of closing it
              from an effect — a direct setState in an effect body cascades
              a render. */}
          <MobileMenuButton key={pathname} profile={profile} unread={unread} />
        </div>
      </div>
    </header>
  );
}

function MobileMenuButton({ profile, unread }: { profile: Profile; unread: UnreadNotificationSections }) {
  const [open, setOpen] = useState(false);
  const menuItems = [...SECONDARY_NAV_ITEMS, ...(isBoard(profile.role) ? [BEHEER_NAV_ITEM] : [])];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Menu sluiten" : "Menu openen"}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.08]"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 top-14 z-20 bg-black/20" onClick={() => setOpen(false)} />
          <div className="absolute right-4 top-14 z-30 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
            <nav className="flex flex-col p-1.5">
              {menuItems.map(({ href, label, icon: Icon, badgeKey }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                >
                  <Icon size={18} />
                  {label}
                  {badgeKey && (
                    <span className="ml-auto">
                      <NavBadge count={unread[badgeKey]} />
                    </span>
                  )}
                </Link>
              ))}
            </nav>
            <div className="flex items-center justify-between border-t border-border px-3 py-2.5">
              <span className="text-xs text-muted">{ROLE_LABELS[profile.role]}</span>
              <LogoutButton />
            </div>
          </div>
        </>
      )}
    </>
  );
}
