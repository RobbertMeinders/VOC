import { ArrowDown, ArrowUp } from "lucide-react";
import { Sparkline } from "./Charts";
import type { Kpi } from "@/lib/statistics/shared";

const nl = new Intl.NumberFormat("nl-NL");

export function KpiTile({ kpi, compareLabel, compare }: { kpi: Kpi; compareLabel: string; compare: boolean }) {
  // Foutenrapport L1: kpi.value kan null zijn (bv. gemiddelde bezetting
  // zonder een enkele activiteit met een maximum) — dan geen delta tonen,
  // want die zou net zo misleidend zijn als het getal zelf.
  const delta = kpi.previousValue === null || kpi.value === null ? null : kpi.value - kpi.previousValue;
  // Foutenrapport L3: een delta tussen twee percentages is in procentpunt,
  // niet in procent — "+75%" suggereert een relatieve toename van 75%,
  // terwijl het bv. van 13% naar 88% ging (+75 procentpunt).
  const deltaUnit = kpi.unit === "%" ? "pp" : (kpi.unit ?? "");

  return (
    <div className="min-w-0 rounded-2xl bg-surface p-4 pb-3 shadow-sm">
      <p className="truncate text-xs text-muted">{kpi.label}</p>
      <p className="font-display text-[1.75rem] font-extrabold leading-tight tracking-[-0.03em] text-foreground">
        {kpi.value === null ? "–" : nl.format(kpi.value)}
        {kpi.value !== null && kpi.unit && <small className="ml-1 text-sm font-semibold text-muted">{kpi.unit}</small>}
      </p>
      {kpi.note ? (
        <p className="text-xs text-muted">{kpi.note}</p>
      ) : compare && delta !== null ? (
        <p className="flex items-center gap-1 text-xs text-muted tabular-nums">
          {delta !== 0 && (
            <span className={delta > 0 ? "flex items-center text-status-success" : "flex items-center text-danger-text"}>
              {delta > 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
              <span className="font-semibold">
                {delta > 0 ? "+" : "−"}
                {nl.format(Math.abs(delta))}
                {deltaUnit}
              </span>
            </span>
          )}
          {delta === 0 && <span className="font-semibold text-foreground">±0{deltaUnit}</span>}
          t.o.v. {compareLabel}
        </p>
      ) : (
        <p className="text-xs text-muted">&nbsp;</p>
      )}
      {kpi.sparkline && kpi.sparkline.length > 1 && <Sparkline values={kpi.sparkline} color="var(--chart-primary)" />}
    </div>
  );
}
