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
  pendingMembershipRequests: number;
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
        itemLabel="bedrijven"
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
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-foreground hover:border-muted hover:text-foreground",
                  expanded ? "border-foreground/20 bg-raised text-foreground" : "border-border bg-surface"
                )}
              >
                {expanded ? <ChevronDown size={14} /> : <Pencil size={13} />}
              </button>
              {canDelete && (
                <DeleteButton
                  onDelete={deleteCompanyAction.bind(null, company.id, false)}
                  confirmMessage={`Weet je zeker dat je ${company.name} definitief wilt verwijderen?`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-voc-red-text hover:border-muted"
                  size={13}
                />
              )}
            </>
          );
          return (
            <div key={company.id} className="rounded-2xl bg-surface p-3 shadow-sm">
              {/* Op mobiel gestapelde regels (naam+knoppen, dan de
                  contactgegevens eronder). Vanaf sm (brede beheer-pagina) is
                  dit i.p.v. flex-wrap nu een echt grid met vaste
                  kolombreedtes, zodat adres/telefoon/e-mail/btw-nummer bij
                  elk bedrijf op exact dezelfde horizontale positie staan —
                  een ontbrekend veld laat zijn kolom leeg (invisible, niet
                  weggelaten) i.p.v. de kolommen erna te laten opschuiven. */}
              <div className="flex min-w-0 flex-col gap-1.5 sm:grid sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1.6fr)_130px_minmax(0,1.4fr)_150px_auto] sm:items-center sm:gap-x-4 sm:gap-y-0">
                <div className="flex min-w-0 items-center gap-3">
                  <CompanyLogo logoUrl={company.logoUrl} name={company.name} size={36} />
                  {/* Live QA: het koppelverzoek-label (shrink-0) duwde de
                      bedrijfsnaam ernaast tot 0 breedte bij een langere naam
                      — nu onder de naam i.p.v. ernaast, zodat beide hun
                      eigen regel/breedte houden. */}
                  <div className="min-w-0 flex-1">
                    <Link href={`/bedrijven/${company.id}`} className="block min-w-0 hover:opacity-80">
                      <p className="max-w-[12rem] truncate text-sm font-medium text-foreground sm:max-w-none">{company.name}</p>
                    </Link>
                    {company.pendingMembershipRequests > 0 && (
                      <Link
                        href="/beheer/instroom?tab=koppelingen"
                        className="mt-0.5 inline-block rounded-full bg-petrol-soft px-2 py-0.5 text-[11px] font-medium text-petrol hover:underline"
                      >
                        {company.pendingMembershipRequests} koppelverzoek{company.pendingMembershipRequests === 1 ? "" : "en"}
                      </Link>
                    )}
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-2 sm:hidden">{actions}</div>
                </div>

                <span
                  className={clsx(
                    "flex min-w-0 items-center gap-1 text-xs text-muted",
                    !company.invoiceAddress && "hidden sm:flex sm:invisible"
                  )}
                >
                  <MapPin size={11} className="shrink-0" />
                  <span className="truncate" title={company.invoiceAddress ?? undefined}>
                    {company.invoiceAddress}
                  </span>
                </span>

                <span
                  className={clsx(
                    "flex min-w-0 items-center gap-1 text-xs text-muted",
                    !company.phone && "hidden sm:flex sm:invisible"
                  )}
                >
                  <Phone size={11} className="shrink-0" />
                  <span className="truncate" title={company.phone ?? undefined}>
                    {company.phone}
                  </span>
                </span>

                <span
                  className={clsx(
                    "flex min-w-0 items-center gap-1 text-xs text-muted",
                    !company.effectiveEmail && "hidden sm:flex sm:invisible"
                  )}
                >
                  <Mail size={11} className="shrink-0" />
                  <span className="truncate" title={company.effectiveEmail ?? undefined}>
                    {company.effectiveEmail}
                  </span>
                </span>

                <span
                  className={clsx(
                    "flex min-w-0 items-center gap-1 text-xs text-muted",
                    !company.vatNumber && "hidden sm:flex sm:invisible"
                  )}
                >
                  <Receipt size={11} className="shrink-0" />
                  <span className="truncate" title={company.vatNumber ?? undefined}>
                    {company.vatNumber}
                  </span>
                </span>

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
