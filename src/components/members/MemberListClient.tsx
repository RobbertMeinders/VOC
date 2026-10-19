"use client";

import { Suspense, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { FilterControl, ListToolbar, type ListToolbarFilter } from "@/components/ui/ListToolbar";
import { matchesSearch } from "@/lib/search/normalize";
import { useUrlFilterState } from "@/lib/dom/useUrlFilterState";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { MemberRow, type MemberListItem } from "./MemberRow";

function MemberListInner({ members, branches }: { members: MemberListItem[]; branches: string[] }) {
  const { getInitial, setParam } = useUrlFilterState();
  const [query, setQuery] = useState(() => getInitial("q"));
  const [branche, setBranche] = useState(() => getInitial("branche"));
  // Vanuit het hamburgermenu/Home ("Lid zoeken" → /leden?focus=1): het
  // zoekveld staat dan al klaar om in te typen i.p.v. eerst zelf te moeten
  // klikken.
  const [autoFocusSearch] = useState(() => getInitial("focus") === "1");

  function handleQueryChange(value: string) {
    setQuery(value);
    setParam("q", value);
  }

  function handleBrancheChange(value: string) {
    setBranche(value);
    setParam("branche", value);
  }

  // UX-review Z4: naast naam ook functie, bedrijfsnaam en branche doorzoeken
  // ("wie doet marketing" i.p.v. een exacte naam moeten weten).
  const filtered = useMemo(
    () =>
      members.filter((member) => {
        const matchesQuery = matchesSearch(
          [`${member.first_name} ${member.last_name}`, member.jobTitle, member.company?.name, member.company?.industry],
          query
        );
        const matchesBranche = !branche || member.company?.industry === branche;
        return matchesQuery && matchesBranche;
      }),
    [members, query, branche]
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
        searchPlaceholder="Zoek een lid"
        resultCount={filtered.length}
        totalCount={members.length}
        itemLabel="leden"
        autoFocusSearch={autoFocusSearch}
        filters={filters}
        showFilterButtons={false}
      />
      {/* Rechts uitgelijnd i.p.v. ListToolbar's standaard links-uitgelijnde
          filterrij — zelfde positie als de Branche-filter op de
          bedrijvenpagina (BedrijvenView, naast de Lijst/Kaart-toggle). */}
      {filters.length > 0 && (
        <div className="mb-3 flex justify-end">
          <FilterControl filter={filters[0]} />
        </div>
      )}
      {filtered.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((member) => (
            <MemberRow key={member.id} member={member} />
          ))}
        </div>
      ) : (
        <ComingSoon icon={Users} title="Geen leden gevonden" description="Pas je zoekopdracht of filter aan." />
      )}
    </>
  );
}

export function MemberListClient(props: { members: MemberListItem[]; branches: string[] }) {
  return (
    <Suspense>
      <MemberListInner {...props} />
    </Suspense>
  );
}
