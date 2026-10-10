"use client";

import { Suspense, useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import { ListToolbar, type ListToolbarFilter } from "@/components/ui/ListToolbar";
import { matchesSearch } from "@/lib/search/normalize";
import { useUrlFilterState } from "@/lib/dom/useUrlFilterState";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { BedrijvenView, type MapCapableCompany } from "./BedrijvenView";

export type SearchableCompany = MapCapableCompany & { peopleNames: string[] };

function BedrijvenListInner({ items, branches }: { items: SearchableCompany[]; branches: string[] }) {
  const { getInitial, setParam } = useUrlFilterState();
  const [query, setQuery] = useState(() => getInitial("q"));
  const [branche, setBranche] = useState(() => getInitial("branche"));

  function handleQueryChange(value: string) {
    setQuery(value);
    setParam("q", value);
  }

  function handleBrancheChange(value: string) {
    setBranche(value);
    setParam("branche", value);
  }

  // UX-review Z4: naast naam/plaats ook tagline, branche en de namen van de
  // mensen die er werken doorzoeken.
  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const matchesQuery = matchesSearch([item.name, item.tagline, item.industry, item.city, ...item.peopleNames], query);
        const matchesBranche = !branche || item.industry === branche;
        return matchesQuery && matchesBranche;
      }),
    [items, query, branche]
  );

  const filters: ListToolbarFilter[] = branches.length
    ? [
        {
          key: "branche",
          label: "Branche",
          value: branche,
          options: branches.map((b) => ({ value: b, label: b })),
          onChange: handleBrancheChange,
        },
      ]
    : [];

  return (
    <>
      <ListToolbar
        searchValue={query}
        onSearchChange={handleQueryChange}
        searchPlaceholder="Zoek op bedrijfsnaam, plaats of wie er werkt…"
        resultCount={filtered.length}
        totalCount={items.length}
        filters={filters}
        showFilterButtons={false}
      />
      {filtered.length > 0 ? (
        <BedrijvenView items={filtered} filter={filters[0]} />
      ) : (
        <ComingSoon icon={Building2} title="Geen bedrijven gevonden" description="Pas je zoekopdracht of filter aan." />
      )}
    </>
  );
}

export function BedrijvenListClient(props: { items: SearchableCompany[]; branches: string[] }) {
  return (
    <Suspense>
      <BedrijvenListInner {...props} />
    </Suspense>
  );
}
