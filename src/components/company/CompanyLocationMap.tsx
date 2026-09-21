"use client";

import dynamic from "next/dynamic";
import type { MappableCompany } from "./CompanyMap";

const CompanyMap = dynamic(() => import("./CompanyMap").then((mod) => mod.CompanyMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-surface text-sm text-muted">
      Kaart laden…
    </div>
  ),
});

// Eén bedrijf gecentreerd, voor op de bedrijfspagina zelf — hergebruikt de
// bestaande multi-marker kaart van de bedrijvenoverzichtspagina met een
// array van precies één bedrijf en een compactere hoogte.
export function CompanyLocationMap({ company }: { company: MappableCompany }) {
  return <CompanyMap companies={[company]} heightClass="h-64" zoom={14} />;
}
