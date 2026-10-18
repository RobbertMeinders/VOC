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
          // Eén keer gedefinieerd, twee keer gerenderd (hieronder): op mobiel
          // naast de naam, op sm+ aan het einde van de regel — zie toelichting
          // bij de buitenste rij hieronder.
          const actions = (
            <>
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
            </>
          );
          return (
            <div key={company.id} className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
              {/* Op mobiel twee gestapelde regels (naam+knoppen, dan de
                  contactgegevens eronder) — anders perste de contactregel zich
                  in de smalle restruimte náást de naam en werd alles
                  onleesbaar afgekapt. Vanaf sm (brede beheer-pagina) past alles
                  wél op één regel, dus daar flex-row. */}
              <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1.5">
                <div className="flex items-center gap-3">
                  <CompanyLogo logoUrl={company.logoUrl} name={company.name} size={36} />
                  <Link href={`/bedrijven/${company.id}`} className="min-w-0 hover:opacity-80">
                    <p className="max-w-[12rem] truncate text-sm font-medium text-foreground sm:max-w-[16rem]">{company.name}</p>
                  </Link>
                  <div className="ml-auto flex shrink-0 items-center gap-2 sm:hidden">{actions}</div>
                </div>

                <div className="flex min-w-0 flex-col gap-1 text-xs text-muted sm:flex-1">
                  {company.invoiceAddress && (
                    <span className="flex min-w-0 items-center gap-1">
                      <MapPin size={11} className="shrink-0" />
                      <span className="truncate">{company.invoiceAddress}</span>
                    </span>
                  )}
                  {company.phone && (
                    <span className="flex min-w-0 items-center gap-1">
                      <Phone size={11} className="shrink-0" />
                      <span className="truncate">{company.phone}</span>
                    </span>
                  )}
                  {company.effectiveEmail && (
                    <span className="flex min-w-0 items-center gap-1">
                      <Mail size={11} className="shrink-0" />
                      <span className="truncate">{company.effectiveEmail}</span>
                    </span>
                  )}
                  {company.vatNumber && (
                    <span className="flex min-w-0 items-center gap-1">
                      <Receipt size={11} className="shrink-0" />
                      <span className="truncate">{company.vatNumber}</span>
                    </span>
                  )}
                </div>

                <div className="hidden shrink-0 items-center gap-2 sm:flex">{actions}</div>
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
