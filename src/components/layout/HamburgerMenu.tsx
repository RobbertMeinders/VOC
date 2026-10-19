"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarCheck,
  FileText,
  Info,
  MapPin,
  Menu,
  Newspaper,
  Settings,
  ShieldCheck,
  UserCheck,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { clsx } from "clsx";
import { FloatingPortal } from "@/components/ui/FloatingPortal";
import { Logo } from "@/components/ui/Logo";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useBodyScrollLock } from "@/lib/dom/useBodyScrollLock";
import { useOverlay } from "@/lib/ui/OverlayContext";

type MenuLink = { href: string; label: string; icon: LucideIcon };

// Aanvulling op de redesign (los van de VOC Hub — Beheeromgeving-opdracht
// die dit paneel oorspronkelijk als "Vereniging" inrichtte): het paneel
// achter de hamburgerknop wordt het algemene mobiele menu voor alles wat
// niet in de bottom-nav past — niet alleen verenigingslinks. Drie groepen,
// met scheidingslijnen: Vereniging, Snel naar, en (zonder eigen kopje)
// Instellingen/Privacy. Eigen dingen (profiel/bedrijf/beheer/uitloggen)
// blijven achter "Profiel" (ProfileMenu) — dit paneel dupliceert dat niet.
const VERENIGING_LINKS: MenuLink[] = [
  { href: "/vereniging/over-ons", label: "Over de VOC", icon: Info },
  { href: "/vereniging/bestuur", label: "Bestuur", icon: UserCheck },
  { href: "/vereniging/commissies", label: "Commissies", icon: UsersRound },
  { href: "/documenten", label: "Documenten", icon: FileText },
  { href: "/nieuws", label: "Nieuws", icon: Newspaper },
];

// "Mijn agenda" filtert direct op "Aangemeld" (zelfde query-param als de
// Agenda-filterchip zelf, zie agenda/page.tsx's TYPE_TABS). "Bedrijvenkaart"
// opent /bedrijven al in kaartweergave (zie BedrijvenView's ?view=kaart).
const SNEL_NAAR_LINKS: MenuLink[] = [
  { href: "/agenda?type=mijn-aanmeldingen", label: "Mijn agenda", icon: CalendarCheck },
  { href: "/bedrijven?view=kaart", label: "Bedrijvenkaart", icon: MapPin },
];

// Instellingen staat hier bewust óók (naast de profielkaart/"Profiel"):
// mensen zoeken instellingen vaak achter de hamburger, dubbel staan is hier
// beter dan niet gevonden worden. Privacy & veiligheid zat tot nu toe
// verstopt onder een link binnen Instellingen zelf.
const OVERIGE_LINKS: MenuLink[] = [
  { href: "/instellingen", label: "Instellingen", icon: Settings },
  { href: "/privacy", label: "Privacy & veiligheid", icon: ShieldCheck },
];

function isLinkActive(pathname: string, href: string): boolean {
  const path = href.split("?")[0];
  return path === "/" ? pathname === "/" : pathname.startsWith(path);
}

function MenuGroup({ heading, links, pathname, onNavigate }: { heading?: string; links: MenuLink[]; pathname: string; onNavigate: () => void }) {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      {heading && (
        <p className="px-4 pb-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: "#9FD3D6" }}>
          {heading}
        </p>
      )}
      {links.map(({ href, label, icon: Icon }) => {
        const active = isLinkActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={clsx(
              "relative flex items-center gap-3 px-4 py-3 text-sm font-medium text-white",
              active ? "bg-white/10" : "hover:bg-white/5"
            )}
          >
            {/* Live QA: een border-left met een transparante variant voor het
                niet-actieve item bleek in de praktijk zelf als een vage
                lijn te renderen — alleen voor het actieve item een los
                staafje, geen border-aanpak meer. */}
            {active && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-voc-red-on-petrol" />}
            <Icon size={20} className="text-white/75" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}

export function HamburgerMenu({ logoUrl, siteName }: { logoUrl: string | null; siteName: string }) {
  const { open, toggle, close } = useOverlay("vereniging");
  const pathname = usePathname();

  // Sluiten speelt eerst de omgekeerde schuifanimatie af
  // (animate-slide-out-right) en unmount daarna pas — zelfde "closing"-opzet
  // als MobileProfileMenu, zodat teruggaan vanuit dit paginavullende paneel
  // net zo vloeiend aanvoelt als het openen.
  const [closing, setClosing] = useState(false);
  function requestClose() {
    setClosing(true);
  }
  function handleExitComplete() {
    setClosing(false);
    close();
  }

  useEscapeKey(open && !closing, requestClose);
  useBodyScrollLock(open || closing);

  // Alleen de Vereniging-items tellen voor het oplichten van de knop zelf —
  // "Mijn agenda" (Snel naar) wees de knop ook op /agenda als actief aan,
  // terwijl de eigenlijke Agenda-navigatie daar al een eigen actieve staat
  // heeft (live QA).
  const active = VERENIGING_LINKS.some((l) => isLinkActive(pathname, l.href));

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label="Menu"
        className={clsx(
          "flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.08]",
          (active || open) && "bg-voc-red-light text-voc-red-text"
        )}
      >
        <Menu size={20} />
      </button>
      {/* Zelfde FloatingPortal-redenering als NotificationCenter's mobiele
          paneel: MobileHeader heeft backdrop-blur, dat vangt een
          position:fixed kind anders in zijn eigen, lagere stacking context.
          Donkerpetrol (var(--hero-gradient), zelfde als het welkomstblok en
          de Beheer-zijbalk) i.p.v. de gewone surface-achtergrond — geen
          decoratie/glas/blur. Kleuren zijn hier bewust niet dark-mode-
          afhankelijk: het vlak is zelf al "donker", licht/donker-thema geeft
          hetzelfde resultaat. */}
      {(open || closing) && (
        <FloatingPortal>
          <div
            className={clsx(
              "fixed inset-x-0 bottom-0 top-14 z-50 flex flex-col overflow-y-auto pb-[env(safe-area-inset-bottom)] md:hidden",
              closing ? "animate-slide-out-right" : "animate-slide-in-right"
            )}
            style={{ backgroundImage: "var(--hero-gradient)" }}
            onAnimationEnd={() => {
              if (closing) handleExitComplete();
            }}
          >
            <div className="flex items-center justify-between border-b border-white/[.12] px-4 py-3">
              {/* Alleen het logo-icoon — de sitenaam staat al in de gewone
                  header erboven (MobileHeader), dubbelop in dit paneel. */}
              <Logo logoUrl={logoUrl} siteName={siteName} withLabel={false} />
              <button
                type="button"
                onClick={requestClose}
                aria-label="Sluiten"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/10 focus-visible:!outline-white"
              >
                <X size={16} />
              </button>
            </div>
            <MenuGroup heading="Vereniging" links={VERENIGING_LINKS} pathname={pathname} onNavigate={requestClose} />
            <div className="border-t border-white/[.12]" />
            <MenuGroup heading="Snel naar" links={SNEL_NAAR_LINKS} pathname={pathname} onNavigate={requestClose} />
            <div className="border-t border-white/[.12]" />
            <MenuGroup links={OVERIGE_LINKS} pathname={pathname} onNavigate={requestClose} />
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
