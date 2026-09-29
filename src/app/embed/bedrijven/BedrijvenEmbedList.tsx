"use client";

import { useRef, useState, type MouseEvent } from "react";
import { Building2 } from "lucide-react";
import { CompanyFilters } from "@/components/company/CompanyFilters";
import { BedrijvenView, type MapCapableCompany } from "@/components/company/BedrijvenView";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { CompanyDetailOverlay } from "@/components/embed/CompanyDetailOverlay";

type EmbedCompanyListItem = MapCapableCompany & { slug: string };

// Toont de bedrijvenlijst (incl. zoekbalk) en, na een klik, een zwevende
// overlay met het detail van dat bedrijf erbovenop — de lijst blijft
// gemount en zichtbaar erachter i.p.v. vervangen te worden (zie
// CompanyDetailOverlay voor waarom, en waarom dat deze keer geen groot leeg
// vlak meer oplevert). Dat vereist wel een `position: relative`-context hier
// (het `relative` op de wrapper hieronder): CompanyDetailOverlay positioneert
// zichzelf met `absolute` t.o.v. daarvan. company.href blijft intact als
// progressive-enhancement-fallback (rechtsklik/nieuw tabblad/geen JS wijst
// nog gewoon naar de echte /embed/bedrijven/[slug]-pagina).
export function BedrijvenEmbedList({ items, branches }: { items: EmbedCompanyListItem[]; branches: string[] }) {
  const [selected, setSelected] = useState<{ slug: string; anchorY: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // De overlay moet meteen zichtbaar zijn, ook als de gebruiker ver naar
  // beneden gescrold is in een lange lijst — deze iframe heeft zelf geen
  // scrollbalk (de omliggende WordPress-pagina scrolt 'm als geheel mee),
  // dus window.scrollY is hier altijd 0 en we kunnen niet zomaar navragen
  // "welk stukje van de iframe is nu in beeld" (dat vereist medewerking van
  // de omliggende WordPress-pagina, wat bij een oudere embed-code niet
  // werkt). De aangeklikte kaart zelf staat per definitie al in beeld — dus
  // die positie (t.o.v. deze relative-wrapper) gebruiken we direct als
  // ankerpunt voor de overlay, zonder enige omliggende-pagina-afhankelijkheid.
  function handleSelect(slug: string, e: MouseEvent) {
    e.preventDefault();
    const cardRect = e.currentTarget.getBoundingClientRect();
    const wrapperRect = wrapperRef.current?.getBoundingClientRect();
    const anchorY = Math.max(0, cardRect.top - (wrapperRect?.top ?? 0));
    setSelected({ slug, anchorY });
  }

  const itemsWithClick = items.map((company) => ({
    ...company,
    onClick: (e: MouseEvent) => handleSelect(company.slug, e),
  }));

  return (
    <div ref={wrapperRef} className="relative">
      <CompanyFilters branches={branches} />
      {items.length > 0 ? (
        <BedrijvenView items={itemsWithClick} />
      ) : (
        <ComingSoon icon={Building2} title="Geen bedrijven gevonden" description="Pas je zoekopdracht of filter aan." />
      )}
      {selected && (
        <CompanyDetailOverlay slug={selected.slug} anchorY={selected.anchorY} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
