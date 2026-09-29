"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { CompanyDetailContent, type CompanyDetailData } from "./CompanyDetailContent";

// Een zwevende overlay (de bedrijvenlijst blijft gemount en zichtbaar
// erachter) i.p.v. de lijst te vervangen — gepositioneerd op `anchorY`, de
// positie van de aangeklikte kaart zelf (zie BedrijvenEmbedList voor waarom:
// die staat per definitie al in beeld, dus dat is een betrouwbaar ankerpunt
// zonder enige medewerking van de omliggende WordPress-pagina nodig te
// hebben).
//
// Een eerdere versie dekte de lijst hierachter af met een volledig
// `inset-0`-vlak — dat erfde de hoogte van de (mogelijk veel langere)
// relative-wrapper eromheen, wat een groot leeg grijs vlak rond dit kaartje
// opleverde zodra de lijst lang genoeg was. Deze versie dekt niets meer af:
// alleen een ONZICHTBARE klikvanger over de volledige wrapper (voor
// klik-buiten-het-kaartje-om-sluiten, hoe hoog dan ook — een onzichtbaar
// vlak geeft nooit een zichtbaar hoogte-artefact) plus het kaartje zelf, dat
// door zijn eigen rand/schaduw al genoeg opvalt tegen de lijst erachter.
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
    <div className="absolute inset-0 z-20" onClick={onClose}>
      <div
        className="absolute left-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2"
        style={{ top: anchorY }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-sm hover:border-voc-red hover:text-voc-red"
        >
          <X size={18} />
        </button>

        {/* "Vlak in vlak": een omkaderd frame rond de eigenlijke (witte)
            kaarten, zodat het geheel zich duidelijk afzet tegen de lijst
            erachter i.p.v. los te zweven. */}
        <div className="rounded-3xl border border-border bg-background p-3 shadow-lg">
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
