"use client";

import { useState, type MouseEvent } from "react";
import { Building2 } from "lucide-react";
import { CompanyFilters } from "@/components/company/CompanyFilters";
import { BedrijvenView, type MapCapableCompany } from "@/components/company/BedrijvenView";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { CompanyDetailOverlay } from "@/components/embed/CompanyDetailOverlay";

type EmbedCompanyListItem = MapCapableCompany & { slug: string };

// UX-review E6: deze embed draait in een iframe zonder eigen scrollbalk (de
// hoogte volgt de inhoud, zie EmbedAutoHeight) — alle bedrijven in één keer
// tonen maakte de hele WordPress-pagina daarmee duizenden pixels lang en
// duwde de websitefooter buiten bereik. Toont daarom eerst 24 bedrijven,
// met "Meer tonen" voor de rest — net als de meeste overzichtspagina's met
// veel resultaten.
const PAGE_SIZE = 24;

// Toont de bedrijvenlijst (incl. zoekbalk) en, na een klik, een zwevende
// overlay met het detail van dat bedrijf erbovenop — de lijst blijft
// gemount en zichtbaar (verduisterd) erachter i.p.v. vervangen te worden.
// company.href blijft intact als progressive-enhancement-fallback
// (rechtsklik/nieuw tabblad/geen JS wijst nog gewoon naar de echte
// /embed/bedrijven/[slug]-pagina).
export function BedrijvenEmbedList({ items, branches }: { items: EmbedCompanyListItem[]; branches: string[] }) {
  const [selected, setSelected] = useState<{ slug: string; anchorY: number } | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Zoeken/filteren (CompanyFilters) navigeert met nieuwe searchParams, wat
  // hier een nieuwe, server-gefilterde `items`-array oplevert — zonder dit
  // bleef "Meer tonen" op zijn oude stand staan na een nieuwe zoekopdracht.
  // Tijdens render aanpassen (i.p.v. in een effect) voorkomt een onnodige
  // extra render-cyclus voor iets dat React zelf al als render beschouwt.
  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setVisibleCount(PAGE_SIZE);
  }

  // De overlay moet meteen zichtbaar zijn, ook als de gebruiker ver naar
  // beneden gescrold is in een lange lijst — deze iframe heeft zelf geen
  // scrollbalk (de omliggende WordPress-pagina scrolt 'm als geheel mee),
  // dus window.scrollY is hier altijd 0 en we kunnen niet zomaar navragen
  // "welk stukje van de iframe is nu in beeld" (dat vereist medewerking van
  // de omliggende WordPress-pagina, wat bij een oudere embed-code niet
  // werkt). De aangeklikte kaart zelf staat per definitie al in beeld — dus
  // die positie gebruiken we direct als ankerpunt voor de overlay.
  // getBoundingClientRect().top is al viewport-relatief, en CompanyDetailOverlay
  // positioneert zichzelf nu ook met `position: fixed` (viewport-relatief,
  // zie daar voor waarom) — dus geen omrekening t.o.v. een wrapper meer nodig.
  function handleSelect(slug: string, e: MouseEvent) {
    e.preventDefault();
    const anchorY = Math.max(0, e.currentTarget.getBoundingClientRect().top);
    setSelected({ slug, anchorY });
  }

  const visibleItems = items.slice(0, visibleCount);
  const itemsWithClick = visibleItems.map((company) => ({
    ...company,
    onClick: (e: MouseEvent) => handleSelect(company.slug, e),
  }));
  const remaining = items.length - visibleItems.length;

  return (
    <div>
      <CompanyFilters branches={branches} />
      {items.length > 0 ? (
        <>
          <BedrijvenView items={itemsWithClick} />
          {remaining > 0 && (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              className="mx-auto mt-4 flex h-11 w-full max-w-72 items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition-all duration-150 hover:bg-black/[.03] active:scale-95"
            >
              Meer tonen ({remaining})
            </button>
          )}
        </>
      ) : (
        <ComingSoon icon={Building2} title="Geen bedrijven gevonden" description="Pas je zoekopdracht of filter aan." />
      )}
      {selected && (
        <CompanyDetailOverlay slug={selected.slug} anchorY={selected.anchorY} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
