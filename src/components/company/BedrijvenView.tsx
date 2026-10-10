"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { List, Map as MapIcon } from "lucide-react";
import { clsx } from "clsx";
import { FilterControl, type ListToolbarFilter } from "@/components/ui/ListToolbar";
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
}: {
  items: MapCapableCompany[];
  filter?: ListToolbarFilter;
}) {
  const [view, setView] = useState<"lijst" | "kaart">("lijst");

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
        <div className="inline-flex rounded-lg border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setView("lijst")}
            className={clsx(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
              view === "lijst" ? "bg-voc-red text-white" : "text-muted hover:text-foreground"
            )}
          >
            <List size={14} />
            Lijst
          </button>
          <button
            type="button"
            onClick={() => setView("kaart")}
            className={clsx(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
              view === "kaart" ? "bg-voc-red text-white" : "text-muted hover:text-foreground"
            )}
          >
            <MapIcon size={14} />
            Kaart
          </button>
        </div>
        {filter && <FilterControl filter={filter} />}
      </div>

      {view === "lijst" ? (
        <div className="grid gap-3 sm:grid-cols-2">
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
