import type { ReactNode } from "react";

// Eén kaart voor een instelling die uit meerdere losse schakelaars bestaat
// (bv. Pushmeldingen: aan/uit voor dit apparaat + per categorie) — i.p.v.
// dat elke sub-instelling als eigen SettingRow-kaart los op de pagina
// staat, wat niet liet zien dat ze bij elkaar horen.
export function SettingGroup({ label, description, children }: { label: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm transition-colors duration-150 hover:border-voc-red/30">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <div className="mt-0.5 text-xs text-muted">{description}</div>}
      </div>
      <div className="mt-4 flex flex-col gap-5">{children}</div>
    </div>
  );
}

// Eén rij binnen een SettingGroup — titel links, schakelaar rechts
// uitgelijnd (ook op mobiel, zelfde uitlijning als de rest van de
// instellingen), zonder eigen kaart-omranding of scheidingslijn tussen rijen.
export function SettingSubRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-foreground">{label}</span>
      {children}
    </div>
  );
}
