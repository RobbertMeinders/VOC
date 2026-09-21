"use client";

import Link from "next/link";
import { Building2, LayoutDashboard, LogOut, Settings, User as UserIcon } from "lucide-react";
import { clsx } from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { NavBadge } from "./NavBadge";
import { signOutAction } from "@/lib/auth/actions";
import { isBoard } from "@/lib/auth/roles";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useOverlay } from "@/lib/ui/OverlayContext";
import type { Profile } from "@/lib/auth/session";

type ProfileMenuProps = {
  profile: Profile;
  avatarUrl: string | null;
  companyId: string | null;
  companyName?: string | null;
  beheerBadge?: number;
};

function menuItems(profile: Profile, companyId: string | null) {
  return [
    { href: "/profiel", label: "Mijn profiel", icon: UserIcon },
    ...(companyId ? [{ href: `/bedrijven/${companyId}`, label: "Mijn bedrijfsprofiel", icon: Building2 }] : []),
    { href: "/instellingen", label: "Instellingen", icon: Settings },
    ...(isBoard(profile.role) ? [{ href: "/beheer", label: "Beheer", icon: LayoutDashboard }] : []),
  ];
}

function MenuPanel({
  items,
  beheerBadge,
  onClose,
  className,
}: {
  items: ReturnType<typeof menuItems>;
  beheerBadge?: number;
  onClose: () => void;
  className?: string;
}) {
  useEscapeKey(true, onClose);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={clsx(
          "absolute z-50 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-lg",
          className
        )}
      >
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
          >
            <Icon size={16} />
            <span className="flex-1">{label}</span>
            {label === "Beheer" && beheerBadge ? <NavBadge count={beheerBadge} /> : null}
          </Link>
        ))}
        <form action={signOutAction} className="border-t border-border">
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
          >
            <LogOut size={16} />
            Uitloggen
          </button>
        </form>
      </div>
    </>
  );
}

export function SidebarProfileMenu({ profile, avatarUrl, companyId, companyName, beheerBadge }: ProfileMenuProps) {
  const { open, toggle, close } = useOverlay("profile");
  const items = menuItems(profile, companyId);

  return (
    <div className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full min-w-0 items-center gap-3 rounded-lg p-1.5 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
      >
        <Avatar firstName={profile.first_name} lastName={profile.last_name} avatarUrl={avatarUrl} size={36} />
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-medium text-foreground">
            {profile.first_name} {profile.last_name}
          </p>
          {companyName && <p className="truncate text-xs text-muted">{companyName}</p>}
        </div>
      </button>

      {open && (
        <MenuPanel items={items} beheerBadge={beheerBadge} onClose={close} className="bottom-full left-0 mb-2" />
      )}
    </div>
  );
}

// Rechtsboven op mobiel: enkel het profielicoon (naam/bedrijf staat al op
// het profiel zelf) dat hetzelfde accountmenu opent als de sidebar-kaart.
export function HeaderProfileMenu({ profile, avatarUrl, companyId, beheerBadge }: ProfileMenuProps) {
  const { open, toggle, close } = useOverlay("profile");
  const items = menuItems(profile, companyId);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Account"
        className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/[.04] dark:hover:bg-white/[.08]"
      >
        <Avatar firstName={profile.first_name} lastName={profile.last_name} avatarUrl={avatarUrl} size={28} />
      </button>

      {open && <MenuPanel items={items} beheerBadge={beheerBadge} onClose={close} className="right-0 top-full mt-2" />}
    </div>
  );
}
