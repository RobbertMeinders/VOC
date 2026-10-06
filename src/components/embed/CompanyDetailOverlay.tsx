"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { CompanyDetailContent, type CompanyDetailData } from "./CompanyDetailContent";

// Een zwevende overlay (de bedrijvenlijst blijft gemount en verduisterd
// erachter zichtbaar) — gepositioneerd op `anchorY`, de positie van de
// aangeklikte kaart zelf (zie BedrijvenEmbedList voor waarom: die staat per
// definitie al in beeld, dus dat is een betrouwbaar ankerpunt zonder enige
// medewerking van de omliggende WordPress-pagina nodig te hebben).
//
// `position: fixed` i.p.v. `absolute` t.o.v. een wrapper: deze iframe heeft
// zelf geen scrollbalk (hoogte volgt exact de inhoud, zie EmbedAutoHeight),
// dus "fixed" dekt hier betrouwbaar de volledige, werkelijke inhoud af —
// zonder het risico van een eerdere versie, waar een `absolute inset-0`
// t.o.v. een `relative`-wrapper (die zelf binnen de smallere max-w-5xl-kolom
// zat) niet de volle breedte van bredere viewports raakte, en dus buiten die
// kolom niet op klikken-om-te-sluiten reageerde.
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
    <div className="animate-fade-in fixed inset-0 z-20 bg-black/40" onClick={onClose}>
      <div
        className="absolute left-1/2 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2"
        style={{ top: anchorY }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-sm hover:border-voc-red hover:text-voc-red-text"
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
