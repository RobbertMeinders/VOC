"use client";

import { useEffect } from "react";
import { usePageWidth } from "@/lib/ui/PageWidthContext";

// Rendert niets zelf — een server-component pagina (zoals de nieuwsbrief-
// editor) zet dit ergens in zijn boom om de standaard max-w-6xl-begrenzing
// van AppShell tijdelijk los te laten. Reset bij unmount, zodat de
// volgende, gewone pagina niet per ongeluk breed blijft staan.
export function FullWidthPage() {
  const { setWide } = usePageWidth();

  useEffect(() => {
    setWide(true);
    return () => setWide(false);
  }, [setWide]);

  return null;
}
