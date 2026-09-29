"use client";

import { useState, type MouseEvent } from "react";
import { Building2 } from "lucide-react";
import { CompanyFilters } from "@/components/company/CompanyFilters";
import { BedrijvenView, type MapCapableCompany } from "@/components/company/BedrijvenView";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { CompanyDetailView } from "@/components/embed/CompanyDetailView";
import { scrollEmbedToTop } from "@/components/embed/EmbedAutoHeight";

type EmbedCompanyListItem = MapCapableCompany & { slug: string };

// Toont de bedrijvenlijst (incl. zoekbalk) en, na een klik, het bedrijfsdetail
// — dat VERVANGT de lijst i.p.v. er als zwevende overlay overheen te staan.
// Een eerdere versie deed dat laatste wel (`position: absolute` t.o.v. een
// `relative`-wrapper om lijst + overlay heen), maar erfde daarmee de hoogte
// van die wrapper, die gewoon zo hoog bleef als de (mogelijk veel langere)
// lijst erachter — dat gaf een groot leeg grijs vlak rond een klein kaartje
// zodra er genoeg bedrijven waren. Simpele document-flow-vervanging heeft
// dat probleem niet: de hoogte volgt gewoon de werkelijke inhoud, en
// scrollEmbedToTop() (zie EmbedAutoHeight) zorgt dat de omliggende
// WordPress-pagina niet blijft hangen op de oude scrollpositie zodra die
// hoogte verandert. company.href blijft intact als progressive-enhancement-
// fallback (rechtsklik/nieuw tabblad/geen JS wijst nog gewoon naar de echte
// /embed/bedrijven/[slug]-pagina).
export function BedrijvenEmbedList({ items, branches }: { items: EmbedCompanyListItem[]; branches: string[] }) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  function handleSelect(slug: string, e: MouseEvent) {
    e.preventDefault();
    setSelectedSlug(slug);
    scrollEmbedToTop();
  }

  function handleBack() {
    setSelectedSlug(null);
    scrollEmbedToTop();
  }

  if (selectedSlug) {
    // key={selectedSlug}: forceert een verse mount (dus verse fetch-state)
    // per bedrijf i.p.v. zelf in een effect te resetten.
    return <CompanyDetailView key={selectedSlug} slug={selectedSlug} onBack={handleBack} />;
  }

  const itemsWithClick = items.map((company) => ({
    ...company,
    onClick: (e: MouseEvent) => handleSelect(company.slug, e),
  }));

  return (
    <div>
      <CompanyFilters branches={branches} />
      {items.length > 0 ? (
        <BedrijvenView items={itemsWithClick} />
      ) : (
        <ComingSoon icon={Building2} title="Geen bedrijven gevonden" description="Pas je zoekopdracht of filter aan." />
      )}
    </div>
  );
}
