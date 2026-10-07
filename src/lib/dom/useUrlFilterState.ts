"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";

// UX-review Z1: lijsten filteren nu client-side, direct bij typen — maar de
// zoekterm/filters horen alsnog in de URL (terug-knop, delen). Een gewone
// router.replace() zou de Server Component van de pagina opnieuw laten
// renderen (de hele reden waarom Z1 traag was), dus history.replaceState()
// rechtstreeks: wijzigt de URL zonder navigatie/server-roundtrip.
//
// getInitial wordt alleen gebruikt als lazy useState-initializer (één keer
// bij mount) — vandaar geen ref/effect nodig om 'm actueel te houden.
export function useUrlFilterState() {
  const searchParams = useSearchParams();

  const getInitial = useCallback((key: string): string => searchParams.get(key) ?? "", [searchParams]);

  const setParam = useCallback((key: string, value: string) => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value);
    else params.delete(key);
    const query = params.toString();
    window.history.replaceState(null, "", query ? `${window.location.pathname}?${query}` : window.location.pathname);
  }, []);

  return { getInitial, setParam };
}
