"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useBodyScrollLock } from "@/lib/dom/useBodyScrollLock";
import type { ReactNode } from "react";

// Overlay voor een route die via een Next.js intercepting route (@modal,
// "(.)segment") bovenop de huidige pagina verschijnt in plaats van er
// helemaal naartoe te navigeren: leden-/bedrijfsprofiel, activiteitdetail en
// -formulier. Bewust GEEN donkere achtergrond en GEEN overlap met de
// sidebar/bottom-nav — dit moet aanvoelen als "gewoon een pagina", alleen
// zonder dat je de lijst erachter kwijtraakt. Sluiten (kruisje of Esc) doet
// altijd router.back(), zodat je terugkomt op exact de plek (en scrollpositie)
// van waaruit je de overlay opende — rechtstreeks naar de URL gaan (delen,
// een notificatie, een ververste pagina) toont gewoon de normale volledige
// pagina, niet deze overlay.
export function RouteOverlayPanel({ children }: { children: ReactNode }) {
  const router = useRouter();

  function close() {
    router.back();
  }

  useEscapeKey(true, close);
  useBodyScrollLock(true);

  return (
    <div className="animate-fade-in fixed inset-x-0 bottom-14 top-14 z-30 overflow-y-auto bg-background md:inset-y-0 md:bottom-0 md:left-64 md:top-0">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:max-w-3xl md:px-8 md:py-10">
        <button
          type="button"
          onClick={close}
          aria-label="Sluiten"
          className="mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:border-voc-red hover:text-voc-red"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}
