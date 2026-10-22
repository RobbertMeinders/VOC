"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { List, Map as MapIcon } from "lucide-react";
import { clsx } from "clsx";
import { FilterControl, type ListToolbarFilter } from "@/components/ui/ListToolbar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { CompanyCard, type CompanyListItem } from "./CompanyCard";
import type { MappableCompany } from "./CompanyMap";

const CompanyMap = dynamic(() => import("./CompanyMap").then((mod) => mod.CompanyMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] items-center justify-center rounded-2xl border border-border bg-surface text-sm text-muted">
      Kaart laden…
    </div>
  ),
});

export type MapCapableCompany = CompanyListItem & { latitude: number | null; longitude: number | null };

export function BedrijvenView({
  items,
  filter,
  // Het portaal (/bedrijven) staat naast de sidebar en houdt het bij 2
  // kolommen; alleen de website-embed (geen sidebar, meer ruimte) krijgt er
  // een 3e bij.
  threeColumns = false,
  // Vanuit het hamburgermenu ("Bedrijvenkaart") opent /bedrijven?view=kaart
  // al in kaartweergave — uitgelezen door de aanroeper (BedrijvenListClient,
  // al binnen een Suspense-grens) i.p.v. hier zelf met useSearchParams: dit
  // component wordt ook vanuit de website-embed gebruikt, die niet in een
  // Suspense-grens zit.
  initialView = "lijst",
}: {
  items: MapCapableCompany[];
  filter?: ListToolbarFilter;
  threeColumns?: boolean;
  initialView?: "lijst" | "kaart";
}) {
  const [view, setView] = useState<"lijst" | "kaart">(initialView);

  const withLocation: MappableCompany[] = items.filter(
    (c): c is MapCapableCompany & { latitude: number; longitude: number } => c.latitude !== null && c.longitude !== null
  );

  return (
    <div>
      {/* UX-review: branche-filter stond als losse, volle-breedte rij boven
          deze toggle — neemt op deze ene rij samen minder ruimte in en hoort
          hier ook inhoudelijk bij elkaar (beide bepalen de weergave van
          dezelfde lijst). */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          variant="rood"
          items={[
            {
              key: "lijst",
              active: view === "lijst",
              onClick: () => setView("lijst"),
              label: (
                <span className="flex items-center justify-center gap-1.5">
                  <List size={14} />
                  Lijst
                </span>
              ),
            },
            {
              key: "kaart",
              active: view === "kaart",
              onClick: () => setView("kaart"),
              label: (
                <span className="flex items-center justify-center gap-1.5">
                  <MapIcon size={14} />
                  Kaart
                </span>
              ),
            },
          ]}
          className="w-auto"
        />
        {filter && <FilterControl filter={filter} />}
      </div>

      {view === "lijst" ? (
        <div className={clsx("grid gap-3 sm:grid-cols-2", threeColumns && "md:grid-cols-3")}>
          {items.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      ) : (
        <CompanyMap companies={withLocation} />
      )}
    </div>
  );
}
