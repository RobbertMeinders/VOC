"use client";

import { useEffect, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { INDUSTRIES } from "@/lib/constants/industries";
import { searchCompaniesAction, type CompanyOption } from "@/app/register/[token]/actions";

/**
 * Drop into any <form> that posts to an action reading these field names:
 * company_mode ("existing" | "new" | "skip"), company_id, new_company_name,
 * new_company_industry, new_company_city, new_company_website.
 * Shared between the invite-registration form and the profile page's
 * "add/change my company" section.
 */
export function CompanySelector({
  initialSelected = null,
  // A (UX-audit): bedrijfsstap-logica — bij registreren verplichtte dit
  // altijd een bedrijf kiezen of aanmaken, ook als iemand dat nu nog niet
  // bij de hand heeft. Alleen de registratieflow (RegisterForm) geeft
  // allowSkip mee; op /profiel (CompanyMembershipForm, iemand koos daar
  // zelf al bewust voor "bedrijf toevoegen") blijft dit ongewijzigd.
  allowSkip = false,
  // Robberts feedback: komt het bedrijf al vast mee met de uitnodiging (bv.
  // een collega-uitnodiging, of een handmatige uitnodiging waar het bestuur
  // al een bedrijf koos), dan hoeft er niets meer gekozen te worden — geen
  // "Bedrijf zoeken/Mijn bedrijf toevoegen/Later toevoegen"-keuze, gewoon
  // het ene bedrijf, met "Wijzig" als enige ontsnapping (zie CompanyPicker)
  // voor het geval dat toch niet klopt.
  lockPrefilled = false,
}: {
  initialSelected?: CompanyOption | null;
  allowSkip?: boolean;
  lockPrefilled?: boolean;
}) {
  const [companyMode, setCompanyMode] = useState<"existing" | "new" | "skip">("existing");
  const [selectedCompany, setSelectedCompany] = useState<CompanyOption | null>(initialSelected);

  return (
    <div className="flex flex-col gap-2">
      {!lockPrefilled && (
        <div className="flex flex-wrap gap-2 text-sm">
          <Chip onClick={() => setCompanyMode("existing")} active={companyMode === "existing"}>
            Bedrijf zoeken
          </Chip>
          <Chip onClick={() => setCompanyMode("new")} active={companyMode === "new"}>
            Mijn bedrijf toevoegen
          </Chip>
          {allowSkip && (
            <Chip onClick={() => setCompanyMode("skip")} active={companyMode === "skip"}>
              Later toevoegen
            </Chip>
          )}
        </div>
      )}

      <input type="hidden" name="company_mode" value={lockPrefilled ? "existing" : companyMode} />

      {(lockPrefilled || companyMode === "existing") && (
        <>
          <input type="hidden" name="company_id" value={selectedCompany?.id ?? ""} />
          <CompanyPicker selected={selectedCompany} onSelect={setSelectedCompany} />
        </>
      )}
      {!lockPrefilled && companyMode === "new" && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <Input name="new_company_name" placeholder="Bedrijfsnaam" required />
          <div className="grid grid-cols-2 gap-3">
            <Select name="new_company_industry" defaultValue="" className="h-10 pl-3">
              <option value="">Kies een branche</option>
              {INDUSTRIES.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </Select>
            <Input name="new_company_city" placeholder="Vestigingsplaats" />
          </div>
          <Input name="new_company_website" placeholder="Website (optioneel)" type="url" />
        </div>
      )}
      {!lockPrefilled && companyMode === "skip" && (
        <p className="rounded-lg border border-border px-3 py-2 text-xs text-muted">
          Geen probleem - je kunt dit later toevoegen via je profiel.
        </p>
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
        <button type="button" onClick={() => onSelect(null)} className="text-sm font-medium text-voc-red-text hover:underline">
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
                className="block w-full px-3 py-2 text-left text-sm hover:bg-black/[.04] dark:hover:bg-white/[.08]"
              >
                {company.name}
                {company.city && <span className="text-muted"> · {company.city}</span>}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
