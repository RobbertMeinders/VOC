"use client";

import { useEffect } from "react";
import { setThemeColorMeta } from "@/lib/theme/constants";

function resolve(): "light" | "dark" {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// THEME_INIT_SCRIPT zet <meta name="theme-color"> correct vóór eerste paint,
// maar werd daarna nergens meer bijgewerkt — een thema-wissel (ThemeToggle,
// of een OS-voorkeurwijziging terwijl "Automatisch" actief staat) schakelde
// de app direct, maar de iOS-statusbalk/Android-adresbalktint volgde pas na
// een herstart. Eén gedeelde luisteraar i.p.v. losse aanroepen her en der
// (ThemeToggle, een systeemvoorkeur-listener, ...): elke databron die
// uiteindelijk het data-theme-attribuut verandert (nu alleen ThemeToggle,
// mogelijk later meer) wordt hier automatisch meegenomen via de
// MutationObserver, zonder dat die bron zelf aan theme-color hoeft te denken.
export function ThemeColorSync() {
  useEffect(() => {
    setThemeColorMeta(resolve());

    const observer = new MutationObserver(() => setThemeColorMeta(resolve()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onMediaChange = () => setThemeColorMeta(resolve());
    media.addEventListener("change", onMediaChange);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", onMediaChange);
    };
  }, []);

  return null;
}
