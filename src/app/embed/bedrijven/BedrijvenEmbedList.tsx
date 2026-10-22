"use client";

import { useState, type MouseEvent } from "react";
import { Building2 } from "lucide-react";
import { CompanyFilters } from "@/components/company/CompanyFilters";
import { BedrijvenView, type MapCapableCompany } from "@/components/company/BedrijvenView";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { CompanyDetailOverlay } from "@/components/embed/CompanyDetailOverlay";

type EmbedCompanyListItem = MapCapableCompany & { slug: string };

// Toont de bedrijvenlijst (incl. zoekbalk) en, na een klik, een zwevende
// overlay met het detail van dat bedrijf erbovenop — de lijst blijft
// gemount en zichtbaar (verduisterd) erachter i.p.v. vervangen te worden.
// company.href blijft intact als progressive-enhancement-fallback
// (rechtsklik/nieuw tabblad/geen JS wijst nog gewoon naar de echte
// /embed/bedrijven/[slug]-pagina).
export function BedrijvenEmbedList({ items, branches }: { items: EmbedCompanyListItem[]; branches: string[] }) {
  const [selected, setSelected] = useState<{ slug: string } | null>(null);

  // CompanyDetailOverlay centreert zichzelf nu in het zichtbare deel van de
  // omliggende pagina (postMessage-rondvraag naar embed.js) i.p.v. op de
  // klikpositie, dus hier geen ankerpunt meer te berekenen/door te geven.
  function handleSelect(slug: string, e: MouseEvent) {
    e.preventDefault();
    setSelected({ slug });
  }

  const itemsWithClick = items.map((company) => ({
    ...company,
    onClick: (e: MouseEvent) => handleSelect(company.slug, e),
  }));

  return (
    <div>
      <CompanyFilters branches={branches} />
      {items.length > 0 ? (
        <BedrijvenView items={itemsWithClick} threeColumns />
      ) : (
        <ComingSoon icon={Building2} title="Geen bedrijven gevonden" description="Pas je zoekopdracht of filter aan." />
      )}
      {selected && <CompanyDetailOverlay slug={selected.slug} onClose={() => setSelected(null)} />}
    </div>
  );
}
