"use client";

import { useEffect, useState } from "react";
import { THEME_STORAGE_KEY } from "./constants";

function resolve(): "light" | "dark" {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Voor onderdelen die niet via CSS-variabelen kunnen meekleuren met het
// thema (bv. een Leaflet-tegellaag-URL, die geen custom property kan lezen)
// — reageert zowel op een handmatige ThemeToggle-keuze (het data-theme-
// attribuut op <html>, zie THEME_INIT_SCRIPT) als op een systeemvoorkeur-
// wijziging terwijl "Automatisch" actief staat.
export function useResolvedTheme(): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Uitgesteld naar een microtask zodat setState niet synchroon in de
    // effect-body staat (react-hooks/set-state-in-effect), zelfde patroon
    // als ThemeToggle.
    Promise.resolve().then(() => setTheme(resolve()));

    const observer = new MutationObserver(() => setTheme(resolve()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onMediaChange = () => setTheme(resolve());
    media.addEventListener("change", onMediaChange);

    // Ook reageren op een thema-wijziging in een andere tab (localStorage-
    // event vuurt niet in het eigen tabblad zelf, maar wel in de andere).
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) setTheme(resolve());
    };
    window.addEventListener("storage", onStorage);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", onMediaChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return theme;
}
