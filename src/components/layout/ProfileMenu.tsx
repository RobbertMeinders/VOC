"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type TouchEvent } from "react";
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
const AVATAR_FLIP_MS = 220;
const AVATAR_FLIP_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";

// De profielfoto "reist" van haar kleine plek in de bottom-nav naar haar
// grote plek in het paneel (en terug) — FLIP-techniek (First/Last/Invert/
// Play): eerst de rustpositie in het paneel bepalen, dan het verschil met
// de knop-positie omzetten in een transform die bij het begin geen overgang
// heeft, en daarna in één animatieframe naar "geen transform" overgaan.
// offsetHeight i.p.v. rect-hoogte voor de sheet-rustpositie: dat blijft
// correct ook terwijl de sheet zelf nog aan het op-/dichtschuiven is (een
// transform raakt offsetHeight niet, in tegenstelling tot de rect).
function computeAvatarRestRect(sheetEl: HTMLElement, slotEl: HTMLElement): DOMRect {
  const sheetRect = sheetEl.getBoundingClientRect();
  const slotRect = slotEl.getBoundingClientRect();
  const restTop = window.innerHeight - sheetEl.offsetHeight + (slotRect.top - sheetRect.top);
  return new DOMRect(slotRect.left, restTop, slotRect.width, slotRect.height);
}

function flipTransform(from: DOMRect, to: DOMRect): string {
  return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})`;
}

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
  originRect,
  onClose,
  onExitComplete,
}: {
  profile: Profile;
  avatarUrl: string | null;
  companyName?: string | null;
  items: ReturnType<typeof menuItems>;
  beheerBadge?: number;
  closing: boolean;
  originRect: DOMRect | null;
  onClose: () => void;
  onExitComplete: () => void;
}) {
  useEscapeKey(!closing, onClose);
  useBodyScrollLock(true);

  const sheetRef = useRef<HTMLDivElement>(null);
  const avatarSlotRef = useRef<HTMLDivElement>(null);
  // Twee fases bij sluiten i.p.v. één: eerst reist de foto terug naar de
  // knop en vervaagt de tekst (zichtbaar, zelf aangevraagd — "je moet de
  // animatie ook al zien"), pas daarna schuift de hele sheet omlaag. Bij
  // openen precies omgekeerd: eerst de sheet omhoog, dan de foto erin.
  const [stage, setStage] = useState<"sheet-in" | "avatar-in" | "idle" | "avatar-out" | "sheet-out">(
    originRect ? "sheet-in" : "idle"
  );
  const IDENTITY = "translate(0, 0) scale(1)";
  // withTransition staat los van `stage`: de eerste stap (naar de
  // knop-positie springen, geen overgang) en de tweede stap (naar identity
  // animeren, wél een overgang) gebeuren allebei terwijl stage al
  // "avatar-in"/"avatar-out" is — zonder dit eigen vlaggetje zou React de
  // overgang al aanzetten vóór die eerste (ongewenste) sprong.
  const [avatarAnim, setAvatarAnim] = useState<{ transform: string; withTransition: boolean }>({
    transform: IDENTITY,
    withTransition: false,
  });

  // Vangnet: bij prefers-reduced-motion (of enig ander geval waarin de
  // CSS-animatie niet afspeelt) vuurt onAnimationEnd nooit, en zonder dit
  // zou de foto nooit zichtbaar worden / zou sluiten nooit echt unmounten.
  // Ruim binnen de normale animatieduur, dus normaal gesproken wint
  // onAnimationEnd altijd eerst.
  useEffect(() => {
    if (stage === "sheet-in") {
      const t = setTimeout(() => setStage((s) => (s === "sheet-in" ? "avatar-in" : s)), 400);
      return () => clearTimeout(t);
    }
    if (stage === "sheet-out") {
      const t = setTimeout(onExitComplete, 300);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // Stap 2 bij openen: zodra de sheet zelf tot rust is gekomen, de foto van
  // de knop-positie naar haar plek in het paneel laten "warpen".
  useLayoutEffect(() => {
    if (stage !== "avatar-in" || !originRect || !sheetRef.current || !avatarSlotRef.current) return;
    const rest = computeAvatarRestRect(sheetRef.current, avatarSlotRef.current);
    setAvatarAnim({ transform: flipTransform(originRect, rest), withTransition: false });
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setAvatarAnim({ transform: IDENTITY, withTransition: true }));
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // Sluiten gestart (closing ging van false naar true): eerst stap 1
  // (foto + tekst terug), de sheet zelf schuift pas in stage "sheet-out".
  useEffect(() => {
    if (!closing) return;
    if (!originRect || !sheetRef.current || !avatarSlotRef.current) {
      setStage("sheet-out");
      return;
    }
    const rest = computeAvatarRestRect(sheetRef.current, avatarSlotRef.current);
    setStage("avatar-out");
    setAvatarAnim({ transform: IDENTITY, withTransition: false });
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setAvatarAnim({ transform: flipTransform(originRect, rest), withTransition: true }));
    });
    const timeout = setTimeout(() => setStage("sheet-out"), AVATAR_FLIP_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
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
        ref={sheetRef}
        className={clsx(
          "fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-lg md:hidden",
          stage === "sheet-in" ? "animate-sheet-in" : stage === "sheet-out" ? "animate-sheet-out" : undefined
        )}
        style={
          stage === "sheet-in" || stage === "sheet-out"
            ? undefined
            : { transform: `translateY(${dragY}px)`, transition: dragging ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }
        }
        onAnimationEnd={(e) => {
          if (e.target !== e.currentTarget) return;
          if (stage === "sheet-in") setStage("avatar-in");
          else if (stage === "sheet-out") onExitComplete();
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
            {/* De foto "warpt" van de knop-positie naar hier (en terug) —
                zie computeAvatarRestRect/flipTransform hierboven. Onzichtbaar
                zolang de sheet zelf nog aan het schuiven is: pas als die tot
                rust is gekomen (stage "avatar-in") begint de foto's eigen
                reis, zodat beide bewegingen niet door elkaar heen optellen. */}
            <div
              ref={avatarSlotRef}
              className={stage === "sheet-in" ? "opacity-0" : "opacity-100"}
              style={{
                transform: avatarAnim.transform,
                transformOrigin: "top left",
                transition: avatarAnim.withTransition ? `transform ${AVATAR_FLIP_MS}ms ${AVATAR_FLIP_EASING}` : "none",
              }}
            >
              <Avatar firstName={profile.first_name} lastName={profile.last_name} avatarUrl={avatarUrl} size={48} />
            </div>
            <div
              className={clsx(
                "min-w-0 flex-1 transition-opacity",
                stage === "avatar-out" || stage === "sheet-out" ? "opacity-0 duration-300" : "opacity-100 duration-200"
              )}
            >
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
  const avatarButtonRef = useRef<HTMLSpanElement>(null);
  // De positie/grootte van de kleine foto hier, vastgelegd vlak vóór het
  // openen — zie MenuPanel: daar "warpt" de grote foto in het paneel vanuit
  // precies dit rechthoekje (en terug bij sluiten).
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const items = menuItems(profile, companyId);
  const pathname = usePathname();
  const active =
    pathname.startsWith(`/leden/${profile.id}`) ||
    pathname.startsWith("/profiel") ||
    pathname.startsWith("/instellingen") ||
    pathname.startsWith("/beheer") ||
    (companyId ? pathname.startsWith(`/bedrijven/${companyId}`) : false);

  // Sluiten zet eerst de foto/tekst-terugreis in gang (zie MenuPanel) en
  // unmount de sheet pas daarna — vandaar deze lokale "closing"-fase naast
  // de gedeelde open/dicht-state uit
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

  function handleToggle() {
    if (!open) setOriginRect(avatarButtonRef.current?.getBoundingClientRect() ?? null);
    toggle();
  }

  return (
    <div className="relative flex-1">
      <button
        type="button"
        onClick={handleToggle}
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
        <span ref={avatarButtonRef} className="inline-block">
          <Avatar
            firstName={profile.first_name}
            lastName={profile.last_name}
            avatarUrl={avatarUrl}
            size={26}
            className={clsx(active ? "ring-2 ring-voc-red" : open && "ring-2 ring-border")}
          />
        </span>
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
          originRect={originRect}
          onClose={requestClose}
          onExitComplete={handleExitComplete}
        />
      )}
    </div>
  );
}
