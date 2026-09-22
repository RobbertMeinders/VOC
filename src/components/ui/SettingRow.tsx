import type { ReactNode } from "react";

// Eén consistente kaart-layout voor elke instelling op /instellingen
// (Thema, Pushmeldingen, Bijgewoonde evenementen tonen, ...) — label en
// omschrijving links, de eigenlijke besturing (schakelaar, segmented
// control, ...) rechts uitgelijnd. Voorheen had elke instelling zijn eigen
// indeling/stijl; dit is de gedeelde bouwsteen zodat een nieuwe instelling
// er vanzelf hetzelfde uitziet.
export function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      {/* Onder elkaar op mobiel (een bredere control, zoals Thema's
          segmented control, past anders slecht naast de tekst), naast
          elkaar vanaf sm — zelfde indeling voor elke instelling. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {description && <div className="mt-0.5 text-xs text-muted">{description}</div>}
        </div>
        <div className="shrink-0">{children}</div>
      </div>
    </div>
  );
}
