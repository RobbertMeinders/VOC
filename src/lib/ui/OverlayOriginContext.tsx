"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isOverlayRoute } from "./overlayRoutes";

const OverlayOriginContext = createContext<string | null>(null);

// Onthoudt de laatste "echte" (niet-overlay) pagina waar je was, zodat het
// kruisje op een overlay (ledenprofiel, bedrijfsprofiel, activiteitdetail)
// daarnaartoe terug kan i.p.v. altijd naar een vaste bestemming (/leden,
// /bedrijven) — open je bijv. een bedrijfsprofiel vanuit de feed, dan moet
// sluiten je weer bij de feed brengen, niet bij de bedrijvenlijst. Bijwerken
// tijdens render (i.p.v. in een effect) volgt hetzelfde patroon als
// RouteOverlayPanel's lastPathname hieronder: React's eigen aanpak voor
// "state aanpassen naar aanleiding van een wijzigende prop", zonder een
// extra gecascadeerde render. Je kunt een overlay-route nooit als
// allereerste, verse paginalaad tegenkomen (Next's intercepting routes
// onderscheppen alleen client-side navigatie), dus de initiële state
// hieronder staat al gegarandeerd op een echte basispagina.
export function OverlayOriginProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [origin, setOrigin] = useState(pathname);
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    if (!isOverlayRoute(pathname)) {
      setOrigin(pathname);
    }
  }

  return <OverlayOriginContext.Provider value={origin}>{children}</OverlayOriginContext.Provider>;
}

export function useOverlayOrigin(): string {
  const ctx = useContext(OverlayOriginContext);
  if (ctx === null) throw new Error("useOverlayOrigin must be used within an OverlayOriginProvider");
  return ctx;
}
