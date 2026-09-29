"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { CompanyDetailContent, type CompanyDetailData } from "./CompanyDetailContent";

// Een echte zwevende overlay (bedrijvenlijst blijft erachter) i.p.v. de
// lijst te vervangen — gepositioneerd op `anchorY`, de positie van de
// aangeklikte kaart zelf (zie BedrijvenEmbedList voor waarom: die staat per
// definitie al in beeld, dus dat is een betrouwbaar ankerpunt zonder enige
// medewerking van de omliggende WordPress-pagina nodig te hebben).
//
// Bewust GEEN verduistering (meer) van de lijst erachter of van de
// omliggende WordPress-pagina — dat laatste bleek een herhaaldelijke bron
// van bugs (nooit betrouwbaar te positioneren vanuit een iframe die zelf
// niet weet welk stukje van zichzelf in beeld is, en één keer zelfs de
// menubalk overlappend). bg-background dekt de lijst gewoon simpel en
// solide af i.p.v. 'm te verduisteren.
export function CompanyDetailOverlay({
  slug,
  anchorY,
  onClose,
}: {
  slug: string;
  anchorY: number;
  onClose: () => void;
}) {
  const [company, setCompany] = useState<CompanyDetailData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEscapeKey(true, onClose);

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
    <div className="absolute inset-0 z-20 bg-background" onClick={onClose}>
      <div
        className="absolute left-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2"
        style={{ top: anchorY }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:border-voc-red hover:text-voc-red"
        >
          <X size={18} />
        </button>

        {/* "Vlak in vlak": een omkaderd frame rond de eigenlijke (witte)
            kaarten, zodat het geheel zich duidelijk afzet tegen de
            achtergrond i.p.v. los te zweven. */}
        <div className="rounded-3xl border border-border bg-background p-3 shadow-sm">
          {notFound ? (
            <div className="rounded-2xl bg-surface p-6 text-center text-sm text-muted shadow-sm">Bedrijf niet gevonden.</div>
          ) : !company ? (
            <div className="rounded-2xl bg-surface p-6 text-center text-sm text-muted shadow-sm">Laden…</div>
          ) : (
            <CompanyDetailContent company={company} />
          )}
        </div>
      </div>
    </div>
  );
}
