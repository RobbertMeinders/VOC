"use client";

import { useEffect, useRef, useState } from "react";

// Gedeelde stack van alle momenteel actieve Escape-luisteraars, in
// volgorde van activeren — een druk op Escape sluit alleen de bovenste
// (meest recent geopende), niet allemaal tegelijk. Zonder dit luistert elke
// instantie onafhankelijk op `window`: een foto-lightbox die open staat
// boven het ledenprofiel-overlay (zelf ook een Escape-luisteraar) sloot zo
// in één druk zowel de foto als het hele profiel — je wilt eerst alleen de
// foto kunnen wegklikken.
const activeStack: symbol[] = [];

/** Closes an open overlay (popover/dropdown/modal) on Escape — desktop convention. */
export function useEscapeKey(active: boolean, onEscape: () => void) {
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  });

  // Lazy useState-initializer i.p.v. een ref: stabiele identiteit, één keer
  // bepaald, zonder tijdens render naar ref.current te schrijven/lezen (dat
  // mag niet, zie react-hooks/refs).
  const [id] = useState(() => Symbol("useEscapeKey"));

  useEffect(() => {
    if (!active) return;
    activeStack.push(id);

    function handleKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // Alleen reageren als deze instantie de bovenste (laatst geopende) is.
      if (activeStack[activeStack.length - 1] !== id) return;
      onEscapeRef.current();
    }
    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
      const index = activeStack.indexOf(id);
      if (index !== -1) activeStack.splice(index, 1);
    };
  }, [active, id]);
}
