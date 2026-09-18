"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  registerAction,
  searchCompaniesAction,
  type CompanyOption,
  type RegisterState,
} from "@/app/register/[token]/actions";

const initialState: RegisterState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Account aanmaken…" : "Account aanmaken"}
    </Button>
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
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-sm font-medium text-voc-red hover:underline"
        >
          Wijzig
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        placeholder="Typ de bedrijfsnaam…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
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

export function RegisterForm({
  token,
  prefilledEmail,
}: {
  token: string;
  prefilledEmail: string | null;
}) {
  const registerWithToken = registerAction.bind(null, token);
  const [state, formAction] = useActionState(registerWithToken, initialState);
  const [companyMode, setCompanyMode] = useState<"existing" | "new">("existing");
  const [selectedCompany, setSelectedCompany] = useState<CompanyOption | null>(null);

  if (state.success) {
    return (
      <div className="rounded-lg bg-voc-red-light px-4 py-3 text-sm text-voc-red">
        {state.needsEmailConfirmation
          ? "Bijna klaar! Check je e-mail en klik op de bevestigingslink om je account te activeren."
          : "Je account is aangemaakt. Je wordt automatisch ingelogd…"}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="first_name" className="text-sm font-medium text-foreground">
            Voornaam
          </label>
          <Input id="first_name" name="first_name" required autoComplete="given-name" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="last_name" className="text-sm font-medium text-foreground">
            Achternaam
          </label>
          <Input id="last_name" name="last_name" required autoComplete="family-name" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          E-mailadres
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={prefilledEmail ?? undefined}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Wachtwoord
        </label>
        <Input id="password" name="password" type="password" required autoComplete="new-password" minLength={8} />
        <p className="text-xs text-muted">Minimaal 8 tekens.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="job_title" className="text-sm font-medium text-foreground">
            Functie
          </label>
          <Input id="job_title" name="job_title" autoComplete="organization-title" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-sm font-medium text-foreground">
            Telefoonnummer
          </label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Bedrijf</span>
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

      {state.error && (
        <p role="alert" className="rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
