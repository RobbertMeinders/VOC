"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Mail, MapPin, Phone, Pencil, Receipt } from "lucide-react";
import { CompanyLogo } from "@/components/company/CompanyLogo";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { matchesSearch } from "@/lib/search/normalize";
import { useUrlFilterState } from "@/lib/dom/useUrlFilterState";

export type BeheerBillingRow = {
  id: string;
  name: string;
  logoUrl: string | null;
  invoiceName: string | null;
  invoiceAddress: string | null;
  vatNumber: string | null;
  invoiceEmail: string | null;
  generalEmail: string | null;
  phone: string | null;
};

// Los van BeheerBedrijvenListClient: dit is een leesoverzicht voor de
// boekhouder, geen snel-bewerk-scherm — bewerken van factuurgegevens
// (incl. de "zelfde als bezoekadres"-logica) blijft op het volledige
// bewerkformulier, niet hier opnieuw nagebouwd.
export function BeheerFactuurgegevensListClient({ rows }: { rows: BeheerBillingRow[] }) {
  const { getInitial, setParam } = useUrlFilterState();
  const [query, setQuery] = useState(() => getInitial("q"));

  function handleQueryChange(value: string) {
    setQuery(value);
    setParam("q", value);
  }

  const filtered = useMemo(
    () => rows.filter((r) => matchesSearch([r.name, r.invoiceName, r.vatNumber, r.invoiceEmail], query)),
    [rows, query]
  );

  return (
    <>
      <ListToolbar
        searchValue={query}
        onSearchChange={handleQueryChange}
        searchPlaceholder="Zoek op bedrijfsnaam, factuurnaam of btw-nummer…"
        resultCount={filtered.length}
        totalCount={rows.length}
      />

      <div className="flex flex-col gap-2">
        {filtered.map((row) => {
          const effectiveEmail = row.invoiceEmail ?? row.generalEmail;
          return (
            <div key={row.id} className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <CompanyLogo logoUrl={row.logoUrl} name={row.name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
                  {row.invoiceName && row.invoiceName !== row.name && (
                    <p className="truncate text-xs text-muted">Factuurnaam: {row.invoiceName}</p>
                  )}

                  {/* Eén regel i.p.v. onder elkaar gestapelde velden — alles wat je
                      nodig hebt om een factuur te sturen in één oogopslag. */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <MapPin size={11} className="shrink-0" />
                      {row.invoiceAddress ?? "Geen adres bekend"}
                    </span>
                    {row.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={11} className="shrink-0" />
                        {row.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Mail size={11} className="shrink-0" />
                      {effectiveEmail ?? "Geen e-mailadres"}
                    </span>
                    <span
                      className={
                        row.vatNumber
                          ? "flex items-center gap-1"
                          : "flex items-center gap-1 text-amber-700 dark:text-amber-400"
                      }
                    >
                      <Receipt size={11} className="shrink-0" />
                      {row.vatNumber ?? "Geen btw-nummer"}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/bedrijven/${row.id}/bewerken`}
                  aria-label="Factuurgegevens bewerken"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:border-voc-red hover:text-voc-red-text"
                >
                  <Pencil size={13} />
                </Link>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <ComingSoon icon={Receipt} title="Geen bedrijven gevonden" description="Pas je zoekopdracht aan." />
        )}
      </div>
    </>
  );
}
