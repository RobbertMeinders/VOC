"use client";

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isOverlayRoute } from "./overlayRoutes";

type OverlayHistory = { pop: () => string | null };

const OverlayHistoryContext = createContext<OverlayHistory | null>(null);

// Bridge tussen `pop()` (een event-handler, roept router.push aan) en de
// volgende render van deze pathname (die daardoor verandert): zonder dit zou
// die navigatie zelf weer als een "nieuwe" overlay-transitie gezien worden en
// een extra stack-entry pushen — zie de toelichting in de provider hieronder.
let pendingPop = false;

// Eén gedeelde "terug-stack", specifiek voor overlay-navigatie (ledenprofiel,
// bedrijfsprofiel, activiteitdetail/-formulier, alle beheer-overlays) —
// bijv. vanuit een profiel een bijgewoonde activiteit openen, moet het
// kruisje daarop terug naar dat profiel brengen, niet in één keer helemaal
// naar de oorspronkelijke pagina van vóór het profiel. Bewust GEEN echte
// browser-history (router.back()): tussendoor ook via het menu/bottom-nav
// genavigeerd, en die history-entries tellen óók mee voor back() — deze
// stack bouwt alleen op bij transities NAAR een overlay-route en reset zodra
// je naar een echte (niet-overlay) pagina navigeert, dus menu-navigatie kan
// 'm nooit vervuilen. Bijwerken gebeurt in een effect (niet tijdens render):
// de stack is een ref, niet nodig voor render-output, dus geen enkele reden
// om 'm tijdens render aan te raken.
export function OverlayOriginProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const stackRef = useRef<string[]>([]);
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;
    if (prev === pathname) return;

    if (pendingPop) {
      pendingPop = false;
      return;
    }
    if (isOverlayRoute(pathname)) {
      stackRef.current.push(prev);
    } else {
      stackRef.current = [];
    }
  }, [pathname]);

  const value = useMemo<OverlayHistory>(
    () => ({
      pop: () => {
        const target = stackRef.current.pop();
        if (target !== undefined) pendingPop = true;
        return target ?? null;
      },
    }),
    []
  );

  return <OverlayHistoryContext.Provider value={value}>{children}</OverlayHistoryContext.Provider>;
}

// Retourneert de "pop"-functie i.p.v. een kant-en-klare string: RouteOverlayPanel
// roept deze pas aan op het daadwerkelijke sluitmoment (niet bij elke render),
// zodat de stack alleen verandert als er ook echt gesloten wordt.
export function useOverlayOrigin(): OverlayHistory {
  const ctx = useContext(OverlayHistoryContext);
  if (ctx === null) throw new Error("useOverlayOrigin must be used within an OverlayOriginProvider");
  return ctx;
}
