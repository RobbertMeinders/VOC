"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, type TouchEvent } from "react";
import { X } from "lucide-react";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useBodyScrollLock } from "@/lib/dom/useBodyScrollLock";
import { getOverlayCloseHref, isOverlayRoute } from "@/lib/ui/overlayRoutes";
import type { ReactNode } from "react";

const DISMISS_THRESHOLD = 100;

// Overlay voor een route die via een Next.js intercepting route (@modal,
// "(.)segment") bovenop de huidige pagina verschijnt in plaats van er
// helemaal naartoe te navigeren: leden-/bedrijfsprofiel, activiteitdetail en
// -formulier. Bewust GEEN donkere achtergrond en GEEN overlap met de
// sidebar/bottom-nav — dit moet aanvoelen als "gewoon een pagina", alleen
// zonder dat je de lijst erachter kwijtraakt.
//
// Zit in layout.tsx van elk @modal-segment (i.p.v. in elke losse page.tsx
// en loading.tsx) zodat dit paneel gemonteerd blijft terwijl Suspense
// alleen de inhoud (spinner -> data) erbinnen wisselt — anders monteren
// page.tsx en loading.tsx elk hun eigen paneel-instantie, met een gaatje
// ertussen waarin geen van beide bestaat en de pagina erachter even
// doorschemert.
export function RouteOverlayPanel({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  // Naar-beneden-vegen om te sluiten — alleen vanaf het grijpstrookje, niet
  // vanaf ergens in {children}: dat kan lange, scrollbare inhoud zijn (een
  // heel profiel, een formulier), dus overal laten slepen zou vechten met
  // gewoon scrollen. Het kruisje blijft daarnaast gewoon staan (niet
  // iedereen verwacht/begrijpt het sleepgebaar).
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartY = useRef(0);

  // Next's @modal-slot hoort zichzelf te resetten (via default.tsx) zodra je
  // via een menu-link/knop naar een heel andere pagina navigeert, maar dat
  // reconciliëren gebeurt niet altijd meteen bij client-side navigatie —
  // deze overlay kon dan "doorzweven" boven de nieuwe pagina. Blijft de
  // nieuwe pathname wél een overlay-route (bv. /agenda/nieuw -> /agenda/[id]
  // na het aanmaken van een activiteit), dan is dat een normale interne
  // overgang en laten we 'm gewoon staan — pas bij een echte navigatie weg
  // verbergen we het paneel zelf meteen. Aanpassen tijdens render (i.p.v. in
  // een effect) volgt React's eigen patroon voor "state aanpassen naar
  // aanleiding van een wijzigende prop", zonder een extra gecascadeerde render.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    if (!isOverlayRoute(pathname)) {
      setDismissed(true);
    }
  }

  function close() {
    router.push(getOverlayCloseHref(pathname) ?? "/");
  }

  function handleHandleBarTouchStart(e: TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
    setDragging(true);
  }

  function handleHandleBarTouchMove(e: TouchEvent) {
    // Alleen omlaag laten volgen — omhoog slepen betekent hier niets, het
    // paneel staat al volledig open.
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setDragY(delta);
  }

  function handleHandleBarTouchEnd() {
    setDragging(false);
    if (dragY > DISMISS_THRESHOLD) close();
    else setDragY(0);
  }

  useEscapeKey(!dismissed, close);
  useBodyScrollLock(!dismissed);

  if (dismissed) return null;

  return (
    // key={pathname}: zonder dit blijft dezelfde DOM-node staan zodra je
    // binnen dit @modal-segment van de ene overlay-route naar de andere
    // navigeert (bv. lid A -> lid B, activiteitdetail -> bewerken) — de
    // fade-in-animatie speelt dan niet opnieuw af omdat er niets nieuws
    // gemount wordt. Met de key gebeurt dat wel, terwijl gewone
    // Suspense-wissels binnen dezelfde pathname (loading -> data) hier geen
    // last van hebben, want dan verandert pathname niet.
    <div
      key={pathname}
      className="animate-sheet-in fixed inset-x-0 bottom-14 top-14 z-30 overflow-y-auto rounded-t-2xl bg-background md:inset-y-0 md:bottom-0 md:left-64 md:top-0 md:rounded-none"
      style={{
        transform: `translateY(${dragY}px)`,
        transition: dragging ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Grijpstrookje — alleen op mobiel, waar dit paneel als bottom sheet
          omhoog schuift; op desktop is het een zij-paneel zonder sheet-gevoel.
          Ruimer touch-gebied dan het zichtbare balkje zelf, anders is het
          lastig precies te pakken. */}
      <div
        className="touch-none py-3 md:hidden"
        onTouchStart={handleHandleBarTouchStart}
        onTouchMove={handleHandleBarTouchMove}
        onTouchEnd={handleHandleBarTouchEnd}
      >
        <div className="mx-auto h-1.5 w-10 rounded-full bg-black/[.12] dark:bg-white/[.16]" />
      </div>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:max-w-3xl md:px-8 md:py-10">
        <button
          type="button"
          onClick={close}
          aria-label="Sluiten"
          className="mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:border-voc-red hover:text-voc-red"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}
