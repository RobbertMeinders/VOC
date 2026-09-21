"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

// De vier menu-overlays (zoeken, notificaties, netwerk, account) leven allemaal
// zowel in de sidebar als in de mobiele header/bottom-nav tegelijk in de DOM
// (alleen via CSS per breakpoint verborgen — zie AppShell). Zonder gedeelde
// state kon je twee overlays tegelijk open hebben staan: de backdrop-klik die
// een overlay moet sluiten wordt onderschept door een ándere, later geopende
// overlay die er bovenop staat, dus de eerste sluit nooit. Eén gedeelde
// "welke overlay staat open" state lost dat op: het openen van een nieuwe
// overlay sluit automatisch de vorige.
type OverlayKey = "search" | "notifications" | "netwerk" | "profile";

type OverlayContextValue = {
  openOverlay: OverlayKey | null;
  toggleOverlay: (key: OverlayKey) => void;
  closeOverlay: () => void;
};

const OverlayContext = createContext<OverlayContextValue | null>(null);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [openOverlay, setOpenOverlay] = useState<OverlayKey | null>(null);

  const value = useMemo<OverlayContextValue>(
    () => ({
      openOverlay,
      toggleOverlay: (key) => setOpenOverlay((current) => (current === key ? null : key)),
      closeOverlay: () => setOpenOverlay(null),
    }),
    [openOverlay]
  );

  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}

export function useOverlay(key: OverlayKey) {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error("useOverlay must be used within an OverlayProvider");
  return {
    open: ctx.openOverlay === key,
    toggle: () => ctx.toggleOverlay(key),
    close: ctx.closeOverlay,
  };
}
