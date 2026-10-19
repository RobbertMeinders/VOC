import { clsx } from "clsx";
import type { ReactNode } from "react";

// Beheerdashboard-stattegel: groot cijfer in de kopletter, label erboven,
// optioneel een trend eronder. `trend` blijft weg als er nog geen data voor
// is (geen cijfers verzinnen) — de aanroeper bepaalt zelf de inhoud
// (sparkline, "+6 deze maand", …), dit component regelt alleen de kaart.
export function StatTile({
  label,
  value,
  trend,
  className,
}: {
  label: string;
  value: ReactNode;
  trend?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("rounded-2xl border border-border bg-surface p-3.5 shadow-sm", className)}>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-display mt-0.5 text-2xl font-extrabold tracking-tight text-foreground">{value}</p>
      {trend && <div className="mt-1">{trend}</div>}
    </div>
  );
}
