"use client";

import { useEffect, useId } from "react";

// Sleutel op `window` i.p.v. een module-scoped `let` (zoals de vorige versie
// van dit bestand had): een module-level variabele is alleen ÉÉN gedeelde
// teller zolang alle importeurs ook echt dezelfde module-instantie
// binnenkrijgen. Next.js splitst client-code in losse per-route chunks, en
// een klein, veelgebruikt bestand als dit kan daarbij in de praktijk in
// meerdere chunks terechtkomen i.p.v. in één gedeelde chunk — dan heeft
// route A zijn eigen `lockCount` en route B zijn eigen, losse `lockCount`,
// allebei op 0 begonnen maar geen van beide op de hoogte van wat de ander
// vergrendeld heeft. Zoiets kan precies het gerapporteerde "de scrolbalk is
// soms ineens weg, pas een page refresh helpt"-gedrag verklaren, ook na de
// eerdere fix (die wél de volgorde-afhankelijkheid oploste, maar er nog
// steeds van uitging dat er maar één `lockCount` bestaat). `window` is
// ondubbelzinnig hetzelfde object voor de hele pagina, ongeacht hoeveel
// keer deze module zelf gebundeld is.
const LOCKS_KEY = "__vocScrollLocks";

function getLocks(): Set<string> {
  const w = window as unknown as Record<string, Set<string> | undefined>;
  if (!w[LOCKS_KEY]) w[LOCKS_KEY] = new Set<string>();
  return w[LOCKS_KEY];
}

// Zet de overflow-stijl af van de HUIDIGE inhoud van de set, in plaats van
// een simpele +1/-1 op te tellen: zo herstelt elke vergrendeling/
// ontgrendeling zichzelf altijd naar de daadwerkelijke staat i.p.v. een
// eventuele eerdere telfout (bv. door een dubbele effect-run) door te laten
// optellen. Een `Set` met een uniek id per hook-instantie is bovendien van
// nature idempotent: dezelfde lock twee keer toevoegen (of een niet-
// bestaande lock verwijderen) verstoort de rest niet.
function applyLockState() {
  document.body.style.overflow = getLocks().size > 0 ? "hidden" : "";
}

/**
 * Freezes background scroll while a full-screen overlay is open — without
 * this, iOS Safari can still scroll the page behind a `fixed inset-0` modal
 * on touchmove. The four shared nav overlays (search/notificaties/netwerk/
 * account) get this via OverlayContext, which uses this same hook; one-off
 * modals (likers, aanwezigenlijst, documentvoorbeeld, nieuw-bericht) call it
 * directly.
 */
export function useBodyScrollLock(active: boolean) {
  const id = useId();

  useEffect(() => {
    if (!active) return;
    const locks = getLocks();
    locks.add(id);
    applyLockState();
    return () => {
      locks.delete(id);
      applyLockState();
    };
  }, [active, id]);
}
