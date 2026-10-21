"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Robberts hoofdpunt uit de UX-audit: een klik op een link "doet niets"
// totdat de nieuwe pagina-inhoud (soms pas na tien-plus server-queries)
// binnenkomt — er is tussentijds geen enkel signaal dat er iets gebeurt.
// Dit is een globale, dunne laadbalk bovenaan (zelfde idee als bv. NProgress/
// GitHub's eigen laadbalk), gemount in AppShell zodat 'm op elke route werkt,
// óók een @modal-intercepted navigatie (RouteOverlayPanel) — die gebruikt
// immers dezelfde <Link>/router.push-navigatie.
//
// Next's App Router biedt geen "navigatie gestart"-event (in tegenstelling
// tot de oude Pages Router): de pathname zelf verandert pas zodra de nieuwe
// server-payload al binnen is. Het vroegst waarneembare signaal is dus de
// klik op de link zelf, vóór Next begint met ophalen — vandaar een
// document-brede click-listener i.p.v. een router-hook.
const MIN_SHOW_DELAY_MS = 100;
const MAX_STUCK_MS = 8000;

export function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stuckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    if (stuckTimeoutRef.current) clearTimeout(stuckTimeoutRef.current);
    showTimeoutRef.current = null;
    stuckTimeoutRef.current = null;
  }

  // De nieuwe pathname is er pas zodra de navigatie daadwerkelijk is
  // afgerond (Next rendert niet eerder om) — dat is het juiste moment om de
  // balk weer te verbergen, voor zowel een gewone als een overlay-route.
  // Zelfde patroon als RouteOverlayPanel: state aanpassen tijdens render
  // naar aanleiding van een wijzigende prop, i.p.v. in een effect (dat zou
  // een overbodige extra gecascadeerde render geven).
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setVisible(false);
  }

  // clearTimers() raakt refs aan, dus hoort in een effect, niet in de
  // render-tak hierboven (die alleen state synchroniseert).
  useEffect(() => {
    clearTimers();
  }, [pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      clearTimers();
      // Korte vertraging: een al geprefetchte/razendsnelle navigatie flitst
      // de balk dan niet zinloos aan-en-meteen-weer-uit.
      showTimeoutRef.current = setTimeout(() => setVisible(true), MIN_SHOW_DELAY_MS);
      // Vangnet: als de pathname om wat voor reden dan ook nooit wijzigt
      // (bv. de navigatie werd onderweg geannuleerd), blijft de balk niet
      // voor altijd hangen.
      stuckTimeoutRef.current = setTimeout(() => setVisible(false), MAX_STUCK_MS);
    }

    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      clearTimers();
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-0 z-50 h-[3px] overflow-hidden bg-voc-red/20"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="h-full w-1/3 animate-nav-progress bg-voc-red" />
    </div>
  );
}
