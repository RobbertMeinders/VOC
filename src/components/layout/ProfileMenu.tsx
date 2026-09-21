"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Settings, User as UserIcon } from "lucide-react";
import { clsx } from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { Profile } from "@/lib/auth/session";

type ProfileMenuProps = {
  profile: Profile;
  avatarUrl: string | null;
  companyId: string | null;
};

function menuItems(companyId: string | null) {
  return [
    { href: "/profiel", label: "Mijn profiel", icon: UserIcon },
    ...(companyId ? [{ href: `/bedrijven/${companyId}`, label: "Mijn bedrijfsprofiel", icon: Building2 }] : []),
    { href: "/instellingen", label: "Instellingen", icon: Settings },
  ];
}

function MenuPanel({
  items,
  onClose,
  className,
}: {
  items: ReturnType<typeof menuItems>;
  onClose: () => void;
  className?: string;
}) {
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div
        className={clsx(
          "absolute z-30 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-lg",
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
            {label}
          </Link>
        ))}
      </div>
    </>
  );
}

export function SidebarProfileMenu({ profile, avatarUrl, companyId }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const items = menuItems(companyId);

  return (
    <div className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full min-w-0 items-center gap-3 rounded-lg p-1.5 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
      >
        <Avatar firstName={profile.first_name} lastName={profile.last_name} avatarUrl={avatarUrl} size={36} />
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-medium text-foreground">
            {profile.first_name} {profile.last_name}
          </p>
          <p className="truncate text-xs text-muted">{ROLE_LABELS[profile.role]}</p>
        </div>
      </button>

      {open && <MenuPanel items={items} onClose={() => setOpen(false)} className="bottom-full left-0 mb-2" />}
    </div>
  );
}

export function BottomNavProfileMenu({ profile, avatarUrl, companyId }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = menuItems(companyId);
  const active = pathname.startsWith("/profiel") || pathname.startsWith("/instellingen");

  return (
    <div className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex h-14 w-full flex-col items-center justify-center gap-0.5 text-xs font-medium",
          active ? "text-voc-red" : "text-muted"
        )}
      >
        <Avatar firstName={profile.first_name} lastName={profile.last_name} avatarUrl={avatarUrl} size={22} />
        Profiel
      </button>

      {open && <MenuPanel items={items} onClose={() => setOpen(false)} className="bottom-full right-0 mb-2" />}
    </div>
  );
}
