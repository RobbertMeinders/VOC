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
// gemount en zichtbaar/verduisterd erachter (net als in het portaal), i.p.v.
// vervangen te worden. Dat vereist wel een `position: relative`-context hier
// (het `relative` op de wrapper hieronder): CompanyDetailOverlay positioneert
// zichzelf met `absolute` t.o.v. daarvan. company.href blijft intact als
// progressive-enhancement-fallback (rechtsklik/nieuw tabblad/geen JS wijst
// nog gewoon naar de echte /embed/bedrijven/[slug]-pagina).
export function BedrijvenEmbedList({ items, branches }: { items: EmbedCompanyListItem[]; branches: string[] }) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const itemsWithClick = items.map((company) => ({
    ...company,
    onClick: (e: MouseEvent) => {
      e.preventDefault();
      setSelectedSlug(company.slug);
    },
  }));

  return (
    <div className="relative">
      <CompanyFilters branches={branches} />
      {items.length > 0 ? (
        <BedrijvenView items={itemsWithClick} />
      ) : (
        <ComingSoon icon={Building2} title="Geen bedrijven gevonden" description="Pas je zoekopdracht of filter aan." />
      )}
      {selectedSlug && <CompanyDetailOverlay slug={selectedSlug} onClose={() => setSelectedSlug(null)} />}
    </div>
  );
}
