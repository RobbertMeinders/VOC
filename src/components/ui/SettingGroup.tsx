import type { ReactNode } from "react";

// Eén kaart voor een instelling die uit meerdere losse schakelaars bestaat
// (bv. Pushmeldingen: aan/uit voor dit apparaat + per categorie) — i.p.v.
// dat elke sub-instelling als eigen SettingRow-kaart los op de pagina
// staat, wat niet liet zien dat ze bij elkaar horen.
export function SettingGroup({ label, description, children }: { label: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <div className="mt-0.5 text-xs text-muted">{description}</div>}
      </div>
      <div className="mt-4 flex flex-col divide-y divide-border">{children}</div>
    </div>
  );
}

// Eén rij binnen een SettingGroup — zelfde label/omschrijving/besturing-
// indeling als SettingRow, maar zonder eigen kaart-omranding.
export function SettingSubRow({ label, description, children }: { label: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm text-foreground">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
