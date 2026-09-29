"use client";

import { useEffect } from "react";

// Module-scoped teller i.p.v. per-hook "onthoud de vorige overflow-waarde en
// zet 'm bij het sluiten terug": met zoveel losse plekken die dit gebruiken
// (elk los modal/overlay in de app, plus de vier gedeelde menu-overlays via
// OverlayContext) kon dat overlappen zodra er twee tegelijk open stonden
// (bv. een documentvoorbeeld openen vanuit een al openstaand profiel-
// overlay). Het "onthoud vorige waarde"-patroon liet de TWEEDE lock dan de
// overflow van de EERSTE (al "hidden") als zijn eigen "origineel" opvangen —
// sloot de eerste overlay vóór de tweede, dan ontgrendelde die de pagina te
// vroeg; sloot de tweede daarna, dan zette die 'm blijvend weer op "hidden"
// terwijl er allang niets meer open stond, tot een page refresh het
// resette. Precies het gerapporteerde "scrollbalk is soms ineens weg"-gedrag.
// Een gedeelde teller telt op bij vergrendelen en af bij ontgrendelen,
// ongeacht volgorde: alleen de eerste vergrendeling zet 'm dicht, alleen de
// laatste ontgrendeling zet 'm weer open.
let lockCount = 0;

/**
 * Freezes background scroll while a full-screen overlay is open — without
 * this, iOS Safari can still scroll the page behind a `fixed inset-0` modal
 * on touchmove. The four shared nav overlays (search/notificaties/netwerk/
 * account) get this via OverlayContext, which uses this same hook; one-off
 * modals (likers, aanwezigenlijst, documentvoorbeeld, nieuw-bericht) call it
 * directly.
 */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lockCount++;
    if (lockCount === 1) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      lockCount--;
      if (lockCount === 0) {
        document.body.style.overflow = "";
      }
    };
  }, [active]);
}
