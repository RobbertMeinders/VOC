"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, ChevronDown, Mail, Phone, Pencil } from "lucide-react";
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
    () => companies.filter((c) => matchesSearch([c.name, c.industry, c.city, c.email, c.phone, c.website], query)),
    [companies, query]
  );

  return (
    <>
      <ListToolbar
        searchValue={query}
        onSearchChange={handleQueryChange}
        searchPlaceholder="Zoek op bedrijfsnaam, branche, plaats, e-mail…"
        resultCount={filtered.length}
        totalCount={companies.length}
      />

      <div className="flex flex-col gap-2">
        {filtered.map((company) => {
          const expanded = expandedId === company.id;
          return (
            <div key={company.id} className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <CompanyLogo logoUrl={company.logoUrl} name={company.name} size={40} />
                <Link href={`/bedrijven/${company.id}`} className="min-w-0 flex-1 hover:opacity-80">
                  <p className="truncate text-sm font-medium text-foreground">{company.name}</p>
                </Link>
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

              {/* Vaste kolombreedtes (sm+) i.p.v. flex-wrap: anders schoof elk
                  veld op basis van de lengte van het vorige veld, en liepen
                  e-mail/website niet onder elkaar uit tussen rijen. Elke kolom
                  wordt altijd gerenderd (ook leeg), zodat de posities nooit
                  verspringen. Op mobiel gewoon onder elkaar. */}
              {(company.industry || company.city || company.phone || company.email || company.website) && (
                <div className="ml-[52px] mt-1.5 grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-muted sm:grid-cols-[minmax(0,1fr)_minmax(0,9rem)_minmax(0,13rem)_minmax(0,9rem)] sm:items-center sm:gap-y-0">
                  <span className="min-w-0 truncate">
                    {company.industry}
                    {company.industry && company.city && " · "}
                    {company.city}
                  </span>
                  <span className="flex min-w-0 items-center gap-1">
                    {company.phone && <Phone size={11} className="shrink-0" />}
                    <span className="truncate">{company.phone}</span>
                  </span>
                  <span className="flex min-w-0 items-center gap-1">
                    {company.email && <Mail size={11} className="shrink-0" />}
                    <span className="truncate">{company.email}</span>
                  </span>
                  <span className="min-w-0 truncate">{company.website?.replace(/^https?:\/\//, "")}</span>
                </div>
              )}

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
