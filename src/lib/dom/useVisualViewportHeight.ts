"use client";

import { useEffect, useState } from "react";

// iOS Safari in standalone (PWA) weergave verkleint de layout-viewport niet
// zodra het schermtoetsenbord opent — een `fixed`-gepositioneerd paneel
// (zoals RouteOverlayPanel) blijft daardoor de volle schermhoogte claimen
// terwijl een deel daarvan feitelijk achter het toetsenbord zit, zodat een
// ingedrukt formulierveld of de verzendknop onbereikbaar wordt. Dit volgt de
// werkelijk zichtbare hoogte via de Visual Viewport API, zodat een paneel
// zich daarop kan afstemmen (bv. als max-height, die alleen kan verkleinen
// — dus geen effect zolang het toetsenbord dicht is).
export function useVisualViewportHeight(): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    function update() {
      setHeight(viewport!.height);
    }

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return height;
}
