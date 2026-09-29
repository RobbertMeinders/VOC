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
export function BedrijvenEmbedList({ items, branches }: { items: EmbedCompanyListItem[]; branches: string[] }) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  // Zelfde bericht dat EmbedAutoHeight ook bij een echte paginanavigatie
  // stuurt: laat de omliggende WordPress-pagina terug naar de bovenkant van
  // de iframe scrollen, zodat je de detailweergave (of, bij het sluiten, de
  // lijst) altijd vanaf de titel ziet i.p.v. op je oude scrollpositie
  // middenin de vorige weergave te blijven hangen.
  function scrollEmbedToTop() {
    window.parent.postMessage({ type: "voc-embed-scroll-top" }, "*");
  }

  function openCompany(slug: string) {
    setSelectedSlug(slug);
    scrollEmbedToTop();
  }

  function closeCompany() {
    setSelectedSlug(null);
    scrollEmbedToTop();
  }

  if (selectedSlug) {
    return <CompanyDetailOverlay slug={selectedSlug} onClose={closeCompany} />;
  }

  const itemsWithClick = items.map((company) => ({
    ...company,
    onClick: (e: MouseEvent) => {
      e.preventDefault();
      openCompany(company.slug);
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
