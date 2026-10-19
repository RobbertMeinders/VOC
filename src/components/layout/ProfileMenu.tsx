"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type TouchEvent } from "react";
import { Building2, LayoutDashboard, LogOut, Settings, User as UserIcon, X } from "lucide-react";
import { clsx } from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { NavBadge } from "./NavBadge";
import { FloatingPortal } from "@/components/ui/FloatingPortal";
import { signOutAction } from "@/lib/auth/actions";
import { isBoard } from "@/lib/auth/roles";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useBodyScrollLock } from "@/lib/dom/useBodyScrollLock";
import { useFixedAnchor } from "@/lib/dom/useFixedAnchor";
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
          closing ? "animate-sheet-out" : "animate-sheet-in-spring"
        )}
        style={closing ? undefined : { transform: `translateY(${dragY}px)`, transition: dragging ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}
        onAnimationEnd={(e) => {
          // currentTarget-check: de profielfoto hieronder heeft zijn eigen
          // animate-avatar-grow-out, en dat animationend-event bubbelt ook
          // hierheen — zonder deze check zou onExitComplete() twee keer
          // worden aangeroepen.
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
            {/* Hero-achtige overgang: groeit/krimpt gelijktijdig met de
                sheet zelf (zie globals.css) — leest als "de profielfoto
                beweegt van de kleine knop naar hier", ook zonder pixel-
                exacte FLIP-measurement naar de knop. */}
            <div className={closing ? "animate-avatar-grow-out" : "animate-avatar-grow-in"}>
              <Avatar firstName={profile.first_name} lastName={profile.last_name} avatarUrl={avatarUrl} size={48} />
            </div>
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

        {/* Afwerkronde blok 5: items komen na het open-veren van de sheet
            na elkaar omhoog, zelfde ritme als het hamburgermenu. */}
        <div className="flex flex-col py-1.5">
          {items.map(({ href, label, icon: Icon }, i) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="animate-stagger-item flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
              style={{ animationDelay: `${260 + i * 30}ms` }}
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
            className="animate-stagger-item flex w-full items-center gap-3 px-5 py-3.5 text-left text-sm font-medium text-voc-red-text hover:bg-black/[.04] dark:hover:bg-white/[.06]"
            style={{ animationDelay: `${260 + items.length * 30}ms` }}
          >
            <LogOut size={19} />
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
  const { anchorRef, rect } = useFixedAnchor<HTMLButtonElement>(open);
  useEscapeKey(open, close);

  return (
    <div className="relative min-w-0 flex-1">
      <button
        ref={anchorRef}
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

      {/* FloatingPortal: de sidebar zelf is position:fixed, wat altijd een
          eigen stacking-context creëert — zonder portal blijft dit paneel
          (ook met z-50) daarin "opgesloten" en kan het achter een geopende
          overlay (RouteOverlayPanel, z-30) uitkomen i.p.v. er overheen, want
          de sidebar zelf heeft geen eigen z-index. Zelfde bugklasse als
          MenuPanel hierboven (daar was backdrop-blur de vanger). */}
      {open && rect && (
        <FloatingPortal>
          <div className="fixed inset-0 z-40 cursor-pointer" onClick={close} />
          <div
            className="animate-scale-in origin-bottom fixed z-50 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
            style={{ left: rect.left, bottom: window.innerHeight - rect.top + 8 }}
          >
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
        </FloatingPortal>
      )}
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

  // Sluiten speelt eerst de omgekeerde animatie af (animate-sheet-out +
  // animate-avatar-grow-out) en unmount de sheet daarna pas — vandaar deze
  // lokale "closing"-fase naast de gedeelde open/dicht-state uit
  // OverlayContext. Wordt deze sheet dicht gezet omdat een ándere overlay
  // (bv. Vereniging) opent, dan verdwijnt hij wel meteen zonder animatie —
  // een zelden voorkomend randgeval.
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
