"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, ChevronDown, Mail, MapPin, Pencil, Phone, Receipt } from "lucide-react";
import { clsx } from "clsx";
import { CompanyLogo } from "@/components/company/CompanyLogo";
import { DeleteButton } from "@/components/feed/DeleteButton";
import { CompanyQuickEditForm } from "@/components/beheer/CompanyQuickEditForm";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { matchesSearch } from "@/lib/search/normalize";
import { useUrlFilterState } from "@/lib/dom/useUrlFilterState";
import { deleteCompanyAction } from "@/app/(app)/bedrijven/[id]/actions";

export type BeheerCompanyRow = {
  id: string;
  name: string;
  industry: string | null;
  city: string | null;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  invoiceAddress: string | null;
  effectiveEmail: string | null;
  vatNumber: string | null;
};

function BeheerBedrijvenListInner({ companies, canDelete }: { companies: BeheerCompanyRow[]; canDelete: boolean }) {
  const { getInitial, setParam } = useUrlFilterState();
  const [query, setQuery] = useState(() => getInitial("q"));
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleQueryChange(value: string) {
    setQuery(value);
    setParam("q", value);
  }

  const filtered = useMemo(
    () =>
      companies.filter((c) =>
        matchesSearch([c.name, c.industry, c.city, c.email, c.phone, c.website, c.vatNumber], query)
      ),
    [companies, query]
  );

  return (
    <>
      <ListToolbar
        searchValue={query}
        onSearchChange={handleQueryChange}
        searchPlaceholder="Zoek op bedrijfsnaam, branche, plaats, e-mail, btw-nummer…"
        resultCount={filtered.length}
        totalCount={companies.length}
      />

      <div className="flex flex-col gap-2">
        {filtered.map((company) => {
          const expanded = expandedId === company.id;
          return (
            <div key={company.id} className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <div className="flex min-w-0 shrink-0 items-center gap-3">
                  <CompanyLogo logoUrl={company.logoUrl} name={company.name} size={36} />
                  <Link href={`/bedrijven/${company.id}`} className="min-w-0 hover:opacity-80">
                    <p className="max-w-[12rem] truncate text-sm font-medium text-foreground sm:max-w-[16rem]">{company.name}</p>
                  </Link>
                </div>

                {/* Eén vloeiende regel i.p.v. vaste kolombreedtes: anders bleef
                    er een groot leeg gat staan zodra het adres korter was dan
                    de gereserveerde kolombreedte. Elk veld krijgt nu alleen de
                    ruimte die het echt nodig heeft (tot een max-breedte), en
                    wrapt op smalle schermen gewoon mee i.p.v. apart onder de
                    naam te staan. */}
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                  <span className="flex min-w-0 max-w-[20rem] items-center gap-1">
                    <MapPin size={11} className="shrink-0" />
                    <span className="truncate">{company.invoiceAddress ?? "Geen adres bekend"}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 whitespace-nowrap">
                    {company.phone && <Phone size={11} className="shrink-0" />}
                    <span>{company.phone}</span>
                  </span>
                  <span className="flex min-w-0 max-w-[14rem] items-center gap-1">
                    <Mail size={11} className="shrink-0" />
                    <span className="truncate">{company.effectiveEmail ?? "Geen e-mailadres"}</span>
                  </span>
                  <span
                    className={clsx(
                      "flex shrink-0 items-center gap-1 whitespace-nowrap",
                      !company.vatNumber && "text-amber-700 dark:text-amber-400"
                    )}
                  >
                    <Receipt size={11} className="shrink-0" />
                    <span>{company.vatNumber ?? "Geen btw-nummer"}</span>
                  </span>
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : company.id)}
                    aria-label={expanded ? "Snel bewerken sluiten" : "Snel bewerken"}
                    aria-expanded={expanded}
                    className={clsx(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-foreground hover:border-voc-red hover:text-voc-red-text",
                      expanded ? "border-voc-red bg-voc-red-light text-voc-red-text" : "border-border bg-surface"
                    )}
                  >
                    {expanded ? <ChevronDown size={14} /> : <Pencil size={13} />}
                  </button>
                  {canDelete && (
                    <DeleteButton
                      onDelete={deleteCompanyAction.bind(null, company.id, false)}
                      confirmMessage={`Weet je zeker dat je ${company.name} definitief wilt verwijderen?`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-voc-red-text hover:border-voc-red"
                      size={13}
                    />
                  )}
                </div>
              </div>

              {expanded && (
                <CompanyQuickEditForm
                  companyId={company.id}
                  name={company.name}
                  industry={company.industry}
                  city={company.city}
                  phone={company.phone}
                  email={company.email}
                  website={company.website}
                  onSaved={() => setExpandedId(null)}
                />
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <ComingSoon icon={Building2} title="Geen bedrijven gevonden" description="Pas je zoekopdracht aan." />
        )}
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
