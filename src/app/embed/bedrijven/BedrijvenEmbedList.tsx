"use client";

import { useState, type MouseEvent } from "react";
import { Building2 } from "lucide-react";
import { CompanyFilters } from "@/components/company/CompanyFilters";
import { BedrijvenView, type MapCapableCompany } from "@/components/company/BedrijvenView";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { CompanyDetailOverlay } from "@/components/embed/CompanyDetailOverlay";

type EmbedCompanyListItem = MapCapableCompany & { slug: string };

// Toont de bedrijvenlijst (incl. zoekbalk) óf, na een klik, het detail van
// één bedrijf, binnen dezelfde /embed/bedrijven-route en zonder
// paginanavigatie — zie CompanyDetailOverlay voor waarom (position:fixed
// werkt hier niet zoals verwacht in een height-auto-groeiende iframe). De
// zoekbalk verdwijnt zolang een bedrijf openstaat, net als in het portaal.
// company.href blijft intact als progressive-enhancement-fallback
// (rechtsklik/nieuw tabblad/geen JS wijst nog gewoon naar de echte
// /embed/bedrijven/[slug]-pagina).
//
// Bewust GEEN voc-embed-scroll-top-bericht hier (in tegenstelling tot een
// echte paginanavigatie): dit is geen nieuwe "pagina" maar meer detail over
// dezelfde lijst — een geforceerde window.scrollTo() op de omliggende
// WordPress-pagina op het exacte moment van klikken voelde daardoor als een
// ongewenste, onverwachte sprong. De overlay verschijnt gewoon op de
// plek waar de lijst al stond.
export function BedrijvenEmbedList({ items, branches }: { items: EmbedCompanyListItem[]; branches: string[] }) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  if (selectedSlug) {
    return <CompanyDetailOverlay slug={selectedSlug} onClose={() => setSelectedSlug(null)} />;
  }

  const itemsWithClick = items.map((company) => ({
    ...company,
    onClick: (e: MouseEvent) => {
      e.preventDefault();
      setSelectedSlug(company.slug);
    },
  }));

  return (
    <>
      <CompanyFilters branches={branches} />
      {items.length > 0 ? (
        <BedrijvenView items={itemsWithClick} />
      ) : (
        <ComingSoon icon={Building2} title="Geen bedrijven gevonden" description="Pas je zoekopdracht of filter aan." />
      )}
    </>
  );
}
