"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { CompanyLogo } from "@/components/company/CompanyLogo";
import { DeleteButton } from "@/components/feed/DeleteButton";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { matchesSearch } from "@/lib/search/normalize";
import { useUrlFilterState } from "@/lib/dom/useUrlFilterState";
import { deleteCompanyAction } from "@/app/(app)/bedrijven/[id]/actions";

export type BeheerCompanyRow = {
  id: string;
  name: string;
  industry: string | null;
  city: string | null;
  logoUrl: string | null;
};

function BeheerBedrijvenListInner({ companies, canDelete }: { companies: BeheerCompanyRow[]; canDelete: boolean }) {
  const { getInitial, setParam } = useUrlFilterState();
  const [query, setQuery] = useState(() => getInitial("q"));

  function handleQueryChange(value: string) {
    setQuery(value);
    setParam("q", value);
  }

  const filtered = useMemo(
    () => companies.filter((c) => matchesSearch([c.name, c.industry, c.city], query)),
    [companies, query]
  );

  return (
    <>
      <ListToolbar
        searchValue={query}
        onSearchChange={handleQueryChange}
        searchPlaceholder="Zoek op bedrijfsnaam, branche of plaats…"
        resultCount={filtered.length}
        totalCount={companies.length}
      />

      <div className="flex flex-col gap-2">
        {filtered.map((company) => (
          <div key={company.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm">
            <CompanyLogo logoUrl={company.logoUrl} name={company.name} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{company.name}</p>
              <p className="truncate text-xs text-muted">
                {company.industry}
                {company.industry && company.city && " · "}
                {company.city}
              </p>
            </div>
            <Link
              href={`/bedrijven/${company.id}/bewerken`}
              aria-label="Bewerken"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:border-voc-red hover:text-voc-red-text"
            >
              <Pencil size={13} />
            </Link>
            {canDelete && (
              <DeleteButton
                onDelete={deleteCompanyAction.bind(null, company.id, false)}
                confirmMessage={`Weet je zeker dat je ${company.name} definitief wilt verwijderen?`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-voc-red-text hover:border-voc-red"
                size={13}
              />
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted">Geen bedrijven gevonden.</p>}
      </div>
    </>
  );
}

export function BeheerBedrijvenListClient(props: { companies: BeheerCompanyRow[]; canDelete: boolean }) {
  return (
    <Suspense>
      <BeheerBedrijvenListInner {...props} />
    </Suspense>
  );
}
