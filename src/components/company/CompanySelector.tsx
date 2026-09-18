"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { searchCompaniesAction, type CompanyOption } from "@/app/register/[token]/actions";

/**
 * Drop into any <form> that posts to an action reading these field names:
 * company_mode ("existing" | "new"), company_id, new_company_name,
 * new_company_industry, new_company_city, new_company_website.
 * Shared between the invite-registration form and the profile page's
 * "add/change my company" section.
 */
export function CompanySelector({ initialSelected = null }: { initialSelected?: CompanyOption | null }) {
  const [companyMode, setCompanyMode] = useState<"existing" | "new">("existing");
  const [selectedCompany, setSelectedCompany] = useState<CompanyOption | null>(initialSelected);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setCompanyMode("existing")}
          className={`rounded-full px-3 py-1 ${companyMode === "existing" ? "bg-voc-red text-white" : "bg-black/5 text-muted dark:bg-white/10"}`}
        >
          Bestaand bedrijf
        </button>
        <button
          type="button"
          onClick={() => setCompanyMode("new")}
          className={`rounded-full px-3 py-1 ${companyMode === "new" ? "bg-voc-red text-white" : "bg-black/5 text-muted dark:bg-white/10"}`}
        >
          Nieuw bedrijf
        </button>
      </div>

      <input type="hidden" name="company_mode" value={companyMode} />

      {companyMode === "existing" ? (
        <>
          <input type="hidden" name="company_id" value={selectedCompany?.id ?? ""} />
          <CompanyPicker selected={selectedCompany} onSelect={setSelectedCompany} />
        </>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <Input name="new_company_name" placeholder="Bedrijfsnaam" required />
          <div className="grid grid-cols-2 gap-3">
            <Input name="new_company_industry" placeholder="Branche" />
            <Input name="new_company_city" placeholder="Vestigingsplaats" />
          </div>
          <Input name="new_company_website" placeholder="Website (optioneel)" type="url" />
        </div>
      )}
    </div>
  );
}

function CompanyPicker({ selected, onSelect }: { selected: CompanyOption | null; onSelect: (c: CompanyOption | null) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CompanyOption[]>([]);
  const [queriedFor, setQueriedFor] = useState<string | null>(null);

  const canSearch = !selected && query.trim().length >= 2;
  const searching = canSearch && queriedFor !== query;

  useEffect(() => {
    if (!canSearch) return;

    let cancelled = false;
    const timeout = setTimeout(async () => {
      const found = await searchCompaniesAction(query);
      if (!cancelled) {
        setResults(found);
        setQueriedFor(query);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, canSearch]);

  const visibleResults = canSearch && !searching ? results : [];

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2">
        <div>
          <p className="text-sm font-medium text-foreground">{selected.name}</p>
          {selected.city && <p className="text-xs text-muted">{selected.city}</p>}
        </div>
        <button type="button" onClick={() => onSelect(null)} className="text-sm font-medium text-voc-red hover:underline">
          Wijzig
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input placeholder="Typ de bedrijfsnaam…" value={query} onChange={(e) => setQuery(e.target.value)} />
      {(visibleResults.length > 0 || searching) && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          {searching && <p className="px-3 py-2 text-sm text-muted">Zoeken…</p>}
          {!searching &&
            visibleResults.map((company) => (
              <button
                key={company.id}
                type="button"
                onClick={() => {
                  onSelect(company);
                  setQuery("");
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-voc-red-light hover:text-voc-red"
              >
                {company.name}
                {company.city && <span className="text-muted"> — {company.city}</span>}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
