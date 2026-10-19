"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type TouchEvent } from "react";
import { Building2, LayoutDashboard, LogOut, Settings, User as UserIcon, X } from "lucide-react";
import { clsx } from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { NavBadge } from "./NavBadge";
import { FloatingPortal } from "@/components/ui/FloatingPortal";
import { signOutAction } from "@/lib/auth/actions";
import { isBoard } from "@/lib/auth/roles";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useBodyScrollLock } from "@/lib/dom/useBodyScrollLock";
import { useOverlay } from "@/lib/ui/OverlayContext";
import type { Profile } from "@/lib/auth/session";

const DISMISS_THRESHOLD = 60;

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
    ...(companyId ? [{ href: `/bedrijven/${companyId}`, label: "Mijn bedrijf", icon: Building2 }] : []),
    // Privacy & veiligheid staat niet hier — die link staat al op
    // Instellingen zelf, twee ingangen naar dezelfde pagina is overbodig.
    { href: "/instellingen", label: "Instellingen", icon: Settings },
    ...(isBoard(profile.role) ? [{ href: "/beheer", label: "Beheer", icon: LayoutDashboard }] : []),
  ];
}

function MenuPanel({
  profile,
  avatarUrl,
  companyName,
  items,
  beheerBadge,
  closing,
  onClose,
  onExitComplete,
}: {
  profile: Profile;
  avatarUrl: string | null;
  companyName?: string | null;
  items: ReturnType<typeof menuItems>;
  beheerBadge?: number;
  closing: boolean;
  onClose: () => void;
  onExitComplete: () => void;
}) {
  useEscapeKey(!closing, onClose);
  useBodyScrollLock(true);

  // Vangnet: bij prefers-reduced-motion (animate-sheet-out staat dan op
  // "none") vuurt onAnimationEnd nooit, en zonder dit zou sluiten nooit
  // echt unmounten. Ruim binnen de normale animatieduur (220ms), dus
  // normaal gesproken wint onAnimationEnd altijd eerst.
  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(onExitComplete, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

  // Naar-beneden-vegen om te sluiten, zelfde gevoeligheid/opzet als
  // RouteOverlayPanel: alleen vanaf het kopgebied (grijpstrookje + header
  // met foto/naam), niet vanaf de los scrollbare menu-items eronder.
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartY = useRef(0);

  function handleHeaderTouchStart(e: TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
    setDragging(true);
  }
  function handleHeaderTouchMove(e: TouchEvent) {
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setDragY(delta);
  }
  function handleHeaderTouchEnd() {
    setDragging(false);
    if (dragY > DISMISS_THRESHOLD) onClose();
    else setDragY(0);
  }

  // FloatingPortal: dit paneel opent alleen vanuit BottomNav (mobiel), dat
  // backdrop-blur heeft — zonder portal "vangt" dat de position:fixed
  // kinderen in BottomNav's eigen, lagere stacking context, waardoor dit
  // menu achter een open overlay kon uitkomen i.p.v. er overheen (zie
  // NotificationCenter voor dezelfde bug). md:hidden staat hier expliciet
  // op, want portalen haalt dit paneel los van BottomNav's eigen md:hidden.
  // Een echte bottom sheet (vaste positie onderaan het scherm, animate-sheet-in
  // — zelfde animatie als RouteOverlayPanel) i.p.v. een klein paneeltje
  // geankerd aan de profielknop: op mobiel is dit het volledige accountmenu,
  // dat verdient meer gewicht dan een los dropdown-paneeltje.
  return (
    <FloatingPortal>
      <div
        className={clsx(
          "fixed inset-0 z-40 cursor-pointer bg-black/60 transition-opacity duration-200 md:hidden",
          closing ? "opacity-0" : "animate-fade-in"
        )}
        onClick={onClose}
      />
      <div
        className={clsx(
          "fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-lg md:hidden",
          closing ? "animate-sheet-out" : "animate-sheet-in"
        )}
        style={closing ? undefined : { transform: `translateY(${dragY}px)`, transition: dragging ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}
        onAnimationEnd={(e) => {
          if (closing && e.target === e.currentTarget) onExitComplete();
        }}
      >
        <div
          className="touch-none"
          onTouchStart={handleHeaderTouchStart}
          onTouchMove={handleHeaderTouchMove}
          onTouchEnd={handleHeaderTouchEnd}
        >
          <div className="flex justify-center pt-2.5">
            <div className="h-1.5 w-10 rounded-full bg-black/[.12] dark:bg-white/[.16]" />
          </div>

          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <Avatar firstName={profile.first_name} lastName={profile.last_name} avatarUrl={avatarUrl} size={48} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-foreground">
                {profile.first_name} {profile.last_name}
              </p>
              {companyName && <p className="truncate text-sm text-muted">{companyName}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Sluiten"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-foreground dark:hover:bg-white/[.08]"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-col py-1.5">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
            >
              <Icon size={19} className="text-muted" />
              <span className="flex-1">{label}</span>
              {label === "Beheer" && beheerBadge ? <NavBadge count={beheerBadge} /> : null}
            </Link>
          ))}
        </div>

        <form action={signOutAction} className="border-t border-border py-1.5">
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-sm font-medium text-voc-red-text hover:bg-black/[.04] dark:hover:bg-white/[.06]"
          >
            <LogOut size={19} />
            Uitloggen
          </button>
        </form>
      </div>
    </FloatingPortal>
  );
}

// Op desktop staan Mijn profiel/Mijn bedrijfsprofiel/Instellingen/Beheer
// altijd zichtbaar als gewone sidebar-rijen (zie Sidebar.tsx) i.p.v. achter
// deze knop verstopt. Afwerkronde blok 6: het openklappen hier gaf alleen
// "Uitloggen" en dat kleine paneeltje overlapte het Beheer-teller-badge
// erboven — een los uitlogicoontje naast de naam (zoals het rapport als
// alternatief voorstelde) lost beide in één keer op: geen paneel meer dat
// kan overlappen, en de profielkaart zelf wordt een gewone link naar het
// eigen profiel i.p.v. een knop die niets opent.
export function SidebarProfileMenu({
  profile,
  avatarUrl,
  companyName,
}: Pick<ProfileMenuProps, "profile" | "avatarUrl" | "companyName">) {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <Link
        href={`/leden/${profile.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1.5 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
      >
        <Avatar firstName={profile.first_name} lastName={profile.last_name} avatarUrl={avatarUrl} size={36} />
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-medium text-foreground">
            {profile.first_name} {profile.last_name}
          </p>
          {companyName && <p className="truncate text-xs text-muted">{companyName}</p>}
        </div>
      </Link>
      <form action={signOutAction}>
        <button
          type="submit"
          aria-label="Uitloggen"
          title="Uitloggen"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-black/[.04] hover:text-foreground dark:hover:bg-white/[.06]"
        >
          <LogOut size={18} />
        </button>
      </form>
    </div>
  );
}

// Vijfde item in de mobiele bottom-nav (Home/Community/Agenda/Netwerk/
// Profiel): enkel het profielicoon (naam/bedrijf staat al op het profiel
// zelf) dat het volledige accountmenu opent — op mobiel is er geen ruimte
// voor permanent zichtbare account-links zoals op desktop. Het paneel opent
// omhoog i.p.v. omlaag, want de knop staat nu onderaan het scherm.
export function MobileProfileMenu({ profile, avatarUrl, companyId, companyName, beheerBadge }: ProfileMenuProps) {
  const { open, toggle, close } = useOverlay("profile");
  const [closing, setClosing] = useState(false);
  const items = menuItems(profile, companyId);
  const pathname = usePathname();
  const active =
    pathname.startsWith(`/leden/${profile.id}`) ||
    pathname.startsWith("/profiel") ||
    pathname.startsWith("/instellingen") ||
    pathname.startsWith("/beheer") ||
    (companyId ? pathname.startsWith(`/bedrijven/${companyId}`) : false);

  // Sluiten speelt eerst de omgekeerde animatie af (animate-sheet-out) en
  // unmount de sheet daarna pas — vandaar deze lokale "closing"-fase naast
  // de gedeelde open/dicht-state uit OverlayContext. Wordt deze sheet dicht
  // gezet omdat een ándere overlay (bv. Vereniging) opent, dan verdwijnt
  // hij wel meteen zonder animatie — een zelden voorkomend randgeval.
  function requestClose() {
    setClosing(true);
  }
  function handleExitComplete() {
    setClosing(false);
    close();
  }

  return (
    <div className="relative flex-1">
      <button
        type="button"
        onClick={toggle}
        className={clsx(
          "flex h-14 w-full flex-col items-center justify-center gap-0.5 text-xs font-medium",
          // "active" (op een profiel-/account-route) is de echte BottomNav-
          // actieve-staat en blijft rood ("rood op dieet": actief
          // navigatie-item). "open" (het paneel staat open, ongeacht de
          // route) is geen navigatie-actief-staat en wordt neutraal i.p.v.
          // rood (live QA-feedback).
          active ? "text-voc-red-text" : open ? "text-foreground" : "text-muted"
        )}
      >
        <Avatar
          firstName={profile.first_name}
          lastName={profile.last_name}
          avatarUrl={avatarUrl}
          size={26}
          className={clsx(active ? "ring-2 ring-voc-red" : open && "ring-2 ring-border")}
        />
        Profiel
      </button>

      {(open || closing) && (
        <MenuPanel
          profile={profile}
          avatarUrl={avatarUrl}
          companyName={companyName}
          items={items}
          beheerBadge={beheerBadge}
          closing={closing}
          onClose={requestClose}
          onExitComplete={handleExitComplete}
        />
      )}
    </div>
  );
}
