"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, LogOut, Settings, User as UserIcon } from "lucide-react";
import { clsx } from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { NavBadge } from "./NavBadge";
import { FloatingPortal } from "@/components/ui/FloatingPortal";
import { signOutAction } from "@/lib/auth/actions";
import { isBoard } from "@/lib/auth/roles";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useFixedAnchor, type AnchorRect } from "@/lib/dom/useFixedAnchor";
import { useOverlay } from "@/lib/ui/OverlayContext";
import type { Profile } from "@/lib/auth/session";

const PANEL_WIDTH = 224; // w-56
const EDGE_MARGIN = 16;

type ProfileMenuProps = {
  profile: Profile;
  avatarUrl: string | null;
  companyId: string | null;
  companyName?: string | null;
  beheerBadge?: number;
};

function menuItems(profile: Profile, companyId: string | null) {
  return [
    // Naar de (publieke) weergave i.p.v. meteen het bewerkformulier — daar
    // staat een "Profiel aanpassen"-knop naar /profiel voor wie wil wijzigen.
    { href: `/leden/${profile.id}`, label: "Mijn profiel", icon: UserIcon },
    ...(companyId ? [{ href: `/bedrijven/${companyId}`, label: "Mijn bedrijfsprofiel", icon: Building2 }] : []),
    { href: "/instellingen", label: "Instellingen", icon: Settings },
    ...(isBoard(profile.role) ? [{ href: "/beheer", label: "Beheer", icon: LayoutDashboard }] : []),
  ];
}

function MenuPanel({
  items,
  beheerBadge,
  onClose,
  rect,
}: {
  items: ReturnType<typeof menuItems>;
  beheerBadge?: number;
  onClose: () => void;
  rect: AnchorRect;
}) {
  useEscapeKey(true, onClose);

  // FloatingPortal: dit paneel opent alleen vanuit BottomNav (mobiel), dat
  // backdrop-blur heeft — zonder portal "vangt" dat de position:fixed
  // kinderen in BottomNav's eigen, lagere stacking context, waardoor dit
  // menu achter een open overlay kon uitkomen i.p.v. er overheen (zie
  // NotificationCenter voor dezelfde bug). md:hidden staat hier expliciet
  // op, want portalen haalt dit paneel los van BottomNav's eigen md:hidden.
  // Positie komt van useFixedAnchor (de profielknop), i.p.v. los ergens op
  // het scherm.
  return (
    <FloatingPortal>
      <div className="fixed inset-0 z-40 cursor-pointer md:hidden" onClick={onClose} />
      <div
        className="animate-scale-in origin-bottom fixed z-50 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-lg md:hidden"
        style={{
          right: Math.max(window.innerWidth - rect.right, EDGE_MARGIN),
          left: "auto",
          maxWidth: `calc(100vw - ${EDGE_MARGIN * 2}px)`,
          width: PANEL_WIDTH,
          bottom: window.innerHeight - rect.top + 8,
        }}
      >
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3.5 text-sm text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
          >
            <Icon size={20} />
            <span className="flex-1">{label}</span>
            {label === "Beheer" && beheerBadge ? <NavBadge count={beheerBadge} /> : null}
          </Link>
        ))}
        <form action={signOutAction} className="border-t border-border">
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
          >
            <LogOut size={20} />
            Uitloggen
          </button>
        </form>
      </div>
    </FloatingPortal>
  );
}

// Op desktop staan Mijn profiel/Mijn bedrijfsprofiel/Instellingen/Beheer nu
// altijd zichtbaar als gewone sidebar-rijen (zie Sidebar.tsx) i.p.v. achter
// deze knop verstopt — de profielkaart hier is dus alleen nog de kortste
// weg naar uitloggen.
export function SidebarProfileMenu({
  profile,
  avatarUrl,
  companyName,
}: Pick<ProfileMenuProps, "profile" | "avatarUrl" | "companyName">) {
  const { open, toggle, close } = useOverlay("profile");
  useEscapeKey(open, close);

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
        <>
          <div className="fixed inset-0 z-40 cursor-pointer" onClick={close} />
          <div className="animate-scale-in origin-bottom absolute bottom-full left-0 z-50 mb-2 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
              >
                <LogOut size={20} />
                Uitloggen
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

// Vijfde item in de mobiele bottom-nav (Home/Community/Agenda/Netwerk/
// Profiel): enkel het profielicoon (naam/bedrijf staat al op het profiel
// zelf) dat het volledige accountmenu opent — op mobiel is er geen ruimte
// voor permanent zichtbare account-links zoals op desktop. Het paneel opent
// omhoog i.p.v. omlaag, want de knop staat nu onderaan het scherm.
export function MobileProfileMenu({ profile, avatarUrl, companyId, beheerBadge }: ProfileMenuProps) {
  const { open, toggle, close } = useOverlay("profile");
  const items = menuItems(profile, companyId);
  const pathname = usePathname();
  const { anchorRef, rect } = useFixedAnchor<HTMLButtonElement>(open);
  const active =
    pathname.startsWith(`/leden/${profile.id}`) ||
    pathname.startsWith("/profiel") ||
    pathname.startsWith("/instellingen") ||
    pathname.startsWith("/beheer") ||
    (companyId ? pathname.startsWith(`/bedrijven/${companyId}`) : false);

  return (
    <div className="relative flex-1">
      <button
        ref={anchorRef}
        type="button"
        onClick={toggle}
        className={clsx(
          "flex h-14 w-full flex-col items-center justify-center gap-0.5 text-xs font-medium",
          active || open ? "text-voc-red" : "text-muted"
        )}
      >
        <Avatar
          firstName={profile.first_name}
          lastName={profile.last_name}
          avatarUrl={avatarUrl}
          size={26}
          className={clsx(active && "ring-2 ring-voc-red")}
        />
        Profiel
      </button>

      {open && rect && <MenuPanel items={items} beheerBadge={beheerBadge} onClose={close} rect={rect} />}
    </div>
  );
}
