"use client";

import { Suspense, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { ListToolbar, type ListToolbarFilter } from "@/components/ui/ListToolbar";
import { matchesSearch } from "@/lib/search/normalize";
import { useUrlFilterState } from "@/lib/dom/useUrlFilterState";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { MemberRow, type MemberListItem } from "./MemberRow";

function MemberListInner({ members, branches }: { members: MemberListItem[]; branches: string[] }) {
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
        searchPlaceholder="Zoek op naam, functie of bedrijf…"
        resultCount={filtered.length}
        totalCount={members.length}
        filters={filters}
      />
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
