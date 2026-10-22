"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { CompanyDetailContent, type CompanyDetailData } from "./CompanyDetailContent";

// Een zwevende overlay (de bedrijvenlijst blijft gemount en verduisterd
// erachter zichtbaar), gecentreerd op het daadwerkelijk ZICHTBARE deel van
// de omliggende (WordPress-)pagina, niet op klikhoogte en niet midden van de
// hele iframe (die vaak veel hoger is dan het scherm en geen eigen
// scrollbalk heeft, zie EmbedAutoHeight). Dat vereist medewerking van de
// buitenpagina: een postMessage-rondvraag naar embed.js, dat met
// getBoundingClientRect() van de iframe zelf + de eigen vensterhoogte
// berekent welk iframe-stukje nu in beeld is. Zonder (tijdig) antwoord --
// oudere embed-code, of deze pagina los in een tabblad zonder iframe --
// valt dit terug op het midden van het eigen venster.
//
// `position: fixed` t.o.v. de iframe-viewport (niet t.o.v. een wrapper), om
// dezelfde reden als voorheen bij de klikhoogte-aanpak: deze iframe heeft
// zelf geen scrollbalk, dus "fixed" dekt betrouwbaar de volledige inhoud af.
const VIEWPORT_RESPONSE_TIMEOUT_MS = 250;

export function CompanyDetailOverlay({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [company, setCompany] = useState<CompanyDetailData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [centerY, setCenterY] = useState(() => (typeof window !== "undefined" ? window.innerHeight / 2 : 300));

  useEscapeKey(true, onClose);

  useEffect(() => {
    let resolved = false;

    function onMessage(event: MessageEvent) {
      if (event.source !== window.parent || event.data?.type !== "voc-embed-viewport") return;
      resolved = true;
      setCenterY(event.data.centerY);
    }
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "voc-embed-request-viewport" }, "*");
    const fallbackTimer = window.setTimeout(() => {
      if (!resolved) setCenterY(window.innerHeight / 2);
    }, VIEWPORT_RESPONSE_TIMEOUT_MS);

    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/embed/companies/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<CompanyDetailData>;
      })
      .then((json) => {
        if (!cancelled) setCompany(json);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="animate-fade-in fixed inset-0 z-20 bg-black/40" onClick={onClose}>
      <div
        className="fixed left-1/2 max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto"
        style={{ top: centerY }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-sm hover:border-muted hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {notFound ? (
          <div className="rounded-2xl bg-surface p-6 text-center text-sm text-muted shadow-lg">Bedrijf niet gevonden.</div>
        ) : !company ? (
          <div className="rounded-2xl bg-surface p-6 text-center text-sm text-muted shadow-lg">Laden…</div>
        ) : (
          <CompanyDetailContent company={company} />
        )}
      </div>
    </div>
  );
}
