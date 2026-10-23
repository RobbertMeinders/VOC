import type { ReactNode } from "react";
import { clsx } from "clsx";

// Statistieken-herbouw: puur SVG, geen library — zelfde CSS-only
// group-hover/foreignObject-tooltiptechniek als de vorige versie van dit
// bestand (geen client state nodig, dus geen OS-hoverdelay: de tooltip
// verschijnt direct zodra de muis een hitvlak raakt). Uitgebreid met een
// kruisdraad (verticale lijn) en, bij een lijngrafiek, één gedeelde tooltip
// per x-positie i.p.v. per punt — zodat twee reeksen (en een gestippelde
// vorige-periode-reeks) samen in één tooltip-regel staan.

function ChartTooltip({ x, y, align = "center", children }: { x: number; y: number; align?: "start" | "center" | "end"; children: ReactNode }) {
  const width = 170;
  const tx = align === "start" ? x : align === "end" ? x - width : x - width / 2;
  return (
    <foreignObject x={tx} y={Math.max(y, 0)} width={width} height={60} style={{ overflow: "visible" }} className="pointer-events-none">
      <div className={clsx("flex", align === "start" ? "justify-start" : align === "end" ? "justify-end" : "justify-center")}>
        {/* Foutenrapport L4: transition-opacity van 150ms liet de tooltip
            merkbaar vertraagd verschijnen ("niet echt direct") — duration-75
            i.p.v. de standaard 150ms.
            Foutenrapport M3: group-focus-within i.p.v. alleen group-hover —
            op touch bestaat er geen echte hover, maar het hitvlak hieronder
            krijgt een tabIndex en kan dus focus (en dus :focus-within)
            krijgen bij een tik. */}
        <div className="flex flex-col gap-0.5 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-[11px] font-medium text-background opacity-0 shadow-sm transition-opacity duration-75 group-hover:opacity-100 group-focus-within:opacity-100">
          {children}
        </div>
      </div>
    </foreignObject>
  );
}

// Foutenrapport M3: SVG-tekst (<text fontSize={10}>) schaalt mee met de
// viewBox — op een smalle mobiele kaart (viewBox 640 breed, kaart 326px)
// kwam dat neer op zo'n 6px daadwerkelijke tekengrootte. Let op: een
// foreignObject lost dat NIET op zoals de oorspronkelijke toelichting hier
// beweerde (gemeten met Playwright: dezelfde foreignObject-tekst rendert
// 86px breed op een 326px-brede kaart en 239px breed op een 900px-brede
// kaart — exact de containerbreedte-verhouding, dus hij schaalt wél mee).
// De échte reden dat dit hier niet meer stoort: CHART_WIDTH's eigen
// `maxWidth` op de <svg> (zie LineChart/BarChart) houdt de schaal nooit
// boven 1, dus nooit groter dan hier gekozen — dat is ook wat live
// feedback "elke interactieve grafiek is te groot" oploste (de tooltip
// hieronder is dezelfde foreignObject-techniek en blies op een brede
// desktopkaart net zo mee op).
function AxisLabel({
  x,
  y,
  width = 70,
  height = 16,
  align = "center",
  children,
}: {
  x: number;
  y: number;
  width?: number;
  height?: number;
  align?: "start" | "center" | "end";
  children: ReactNode;
}) {
  const tx = align === "start" ? x : align === "end" ? x - width : x - width / 2;
  return (
    <foreignObject x={tx} y={y} width={width} height={height} style={{ overflow: "visible" }} className="pointer-events-none">
      <div className={clsx("flex h-full items-center", align === "start" ? "justify-start" : align === "end" ? "justify-end" : "justify-center")}>
        <span className="whitespace-nowrap text-[11px] text-muted">{children}</span>
      </div>
    </foreignObject>
  );
}

// Foutenrapport M10: "Trendgrafiek"/"Staafdiagram" zonder titel, waarden of
// periode was het enige tekstalternatief — plus een visueel verborgen
// tabel met labels/waarden per reeks, voor wie de SVG zelf niet kan lezen.
function ChartSrTable({ labels, series }: { labels: string[]; series: ChartSeries[] }) {
  return (
    <table className="sr-only">
      <caption>Waarden per {series.length > 1 ? "reeks en " : ""}periode</caption>
      <thead>
        <tr>
          <th>Periode</th>
          {series.map((s) => (
            <th key={s.name}>{s.name}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {labels.map((label, i) => (
          <tr key={label + i}>
            <td>{label}</td>
            {series.map((s) => (
              <td key={s.name}>{s.values[i] ?? 0}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function describeChart(kind: "Trendgrafiek" | "Staafdiagram", labels: string[], series: ChartSeries[]): string {
  if (labels.length === 0) return kind;
  const allValues = series.flatMap((s) => s.values);
  const max = Math.max(...allValues, 0);
  const maxIndex = series.flatMap((s) => s.values).indexOf(max);
  const maxLabel = labels[maxIndex % labels.length];
  const seriesNames = series.map((s) => s.name).join(", ");
  return `${kind}: ${seriesNames}, periode ${labels[0]} tot ${labels[labels.length - 1]}; hoogste waarde ${max}${maxLabel ? ` op ${maxLabel}` : ""}.`;
}

const CHART_WIDTH = 640;
const PADDING = { top: 10, right: 12, bottom: 24, left: 36 };

function niceStep(max: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(max, 1))));
  const n = max / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function sparseLabelIndexes(count: number, max = 7): Set<number> {
  if (count <= max) return new Set(Array.from({ length: count }, (_, i) => i));
  const step = Math.ceil(count / max);
  const set = new Set<number>();
  for (let i = 0; i < count; i += step) set.add(i);
  set.add(count - 1);
  return set;
}

function Empty({ label, height = 160 }: { label: string; height?: number }) {
  return (
    <div className="flex items-center justify-center text-sm text-muted" style={{ height }}>
      {label}
    </div>
  );
}

export type ChartSeries = { name: string; color: string; dashed?: boolean; values: number[] };

// Lijngrafiek met kruisdraad: één hitvlak per x-positie (labels.length
// kolommen) i.p.v. per punt, zodat alle reeksen op die x samen in één
// tooltip staan — ook de gestippelde vorige-periode-reeks.
export function LineChart({
  labels,
  series,
  height = 220,
  emptyLabel = "Nog geen gegevens in deze periode.",
}: {
  labels: string[];
  series: ChartSeries[];
  height?: number;
  emptyLabel?: string;
}) {
  if (labels.length === 0 || series.every((s) => s.values.every((v) => v === 0))) return <Empty label={emptyLabel} height={height} />;

  const innerW = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerH = height - PADDING.top - PADDING.bottom;
  const max = Math.max(...series.flatMap((s) => s.values), 1);
  const step = niceStep(max / 4);
  const niceMax = Math.ceil(max / step) * step || step;

  const x = (i: number) => PADDING.left + (labels.length === 1 ? innerW / 2 : (i / (labels.length - 1)) * innerW);
  const y = (v: number) => PADDING.top + innerH - (v / niceMax) * innerH;
  const colWidth = innerW / Math.max(labels.length - 1, 1);

  const gridLines: number[] = [];
  for (let v = 0; v <= niceMax + 1e-9; v += step) gridLines.push(v);
  const labelIdx = sparseLabelIndexes(labels.length);

  return (
    <>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${height}`}
        className="w-full overflow-visible"
        style={{ maxWidth: CHART_WIDTH }}
        role="img"
        aria-label={describeChart("Trendgrafiek", labels, series)}
      >
      {gridLines.map((v) => (
        <g key={v}>
          <line x1={PADDING.left} x2={CHART_WIDTH - PADDING.right} y1={y(v)} y2={y(v)} stroke="var(--chart-grid)" strokeWidth={1} />
          <AxisLabel x={PADDING.left - 8} y={y(v) - 7} align="end">
            {Math.round(v)}
          </AxisLabel>
        </g>
      ))}

      {series.map((s) => {
        const path = s.values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
        const areaPath = `${path} L${x(s.values.length - 1)},${y(0)} L${x(0)},${y(0)}Z`;
        return (
          <g key={s.name}>
            {!s.dashed && <path d={areaPath} fill={s.color} opacity={0.08} />}
            <path
              d={path}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? "5 4" : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}

      {/* Foutenrapport (statistieken-polish): datapunten in een eigen laag,
          vóór de interactieve groups hieronder — anders schildert een
          latere (rechtser) kolom zijn bolletjes over de tooltip van een
          eerder gehoverde kolom heen (SVG kent geen z-index, alleen
          documentvolgorde). */}
      <g className="pointer-events-none">
        {labels.map((label, i) =>
          series.map((s) => (
            <circle
              key={`${label}-${i}-${s.name}`}
              cx={x(i)}
              cy={y(s.values[i] ?? 0)}
              r={3}
              fill={s.color}
              stroke="var(--surface)"
              strokeWidth={1.5}
            />
          ))
        )}
      </g>

      {labels.map((label, i) => (
        <g key={label + i} className="group">
          {/* Foutenrapport M3: tabIndex maakt dit hitvlak focusbaar — op
              touch bestaat geen echte :hover, maar een tik geeft wel focus,
              en group-focus-within (ChartTooltip) toont de tooltip dan
              alsnog. */}
          <rect
            x={PADDING.left + colWidth * (i - 0.5)}
            y={PADDING.top}
            width={colWidth}
            height={innerH}
            fill="transparent"
            tabIndex={0}
            role="img"
            aria-label={`${label}: ${series.map((s) => `${s.name} ${s.values[i] ?? 0}`).join(", ")}`}
          />
          <line
            x1={x(i)}
            x2={x(i)}
            y1={PADDING.top}
            y2={PADDING.top + innerH}
            stroke="var(--muted)"
            strokeWidth={1}
            opacity={0}
            className="pointer-events-none transition-opacity group-hover:opacity-40"
          />
          <ChartTooltip
            x={x(i)}
            y={Math.min(...series.map((s) => y(s.values[i] ?? 0))) - 14 - series.length * 15}
            align={i === 0 ? "start" : i === labels.length - 1 ? "end" : "center"}
          >
            <span className="font-semibold">{label}</span>
            {series.map((s) => (
              <span key={s.name} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color, opacity: s.dashed ? 0.7 : 1 }}
                />
                {s.name}: {s.values[i] ?? 0}
              </span>
            ))}
          </ChartTooltip>
        </g>
      ))}

      {labels.map(
        (label, i) =>
          labelIdx.has(i) && (
            <AxisLabel
              key={label + i}
              x={x(i)}
              y={height - 16}
              align={i === 0 ? "start" : i === labels.length - 1 ? "end" : "center"}
            >
              {label}
            </AxisLabel>
          )
      )}
      </svg>
      <ChartSrTable labels={labels} series={series} />
    </>
  );
}

// Gegroepeerde kolommen (1-2 reeksen per label), afgeronde bovenkant.
export function BarChart({
  labels,
  series,
  height = 200,
  emptyLabel = "Nog geen gegevens in deze periode.",
}: {
  labels: string[];
  series: ChartSeries[];
  height?: number;
  emptyLabel?: string;
}) {
  if (labels.length === 0 || series.every((s) => s.values.every((v) => v === 0))) return <Empty label={emptyLabel} height={height} />;

  const innerW = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerH = height - PADDING.top - PADDING.bottom;
  const max = Math.max(...series.flatMap((s) => s.values), 1);
  const step = niceStep(max / 4);
  const niceMax = Math.ceil(max / step) * step || step;
  const y = (v: number) => PADDING.top + innerH - (v / niceMax) * innerH;
  const band = innerW / labels.length;
  const gap = 3;
  const barWidth = Math.min(24, (band * 0.62 - gap * (series.length - 1)) / series.length);
  const labelIdx = sparseLabelIndexes(labels.length, 12);

  const gridLines: number[] = [];
  for (let v = 0; v <= niceMax + 1e-9; v += step) gridLines.push(v);

  return (
    <>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${height}`}
        className="w-full overflow-visible"
        style={{ maxWidth: CHART_WIDTH }}
        role="img"
        aria-label={describeChart("Staafdiagram", labels, series)}
      >
      {gridLines.map((v) => (
        <g key={v}>
          <line x1={PADDING.left} x2={CHART_WIDTH - PADDING.right} y1={y(v)} y2={y(v)} stroke="var(--chart-grid)" strokeWidth={1} />
          <AxisLabel x={PADDING.left - 8} y={y(v) - 7} align="end">
            {Math.round(v)}
          </AxisLabel>
        </g>
      ))}
      {/* Foutenrapport (statistieken-polish): balken in een eigen laag, vóór
          de interactieve groups hieronder — bij veel kolommen (smalle
          banden) kan een balk anders over de tooltip van een naburige
          kolom heen vallen (zelfde paint-order-reden als LineChart). */}
      <g className="pointer-events-none">
        {labels.map((label, i) => {
          const center = PADDING.left + band * i + band / 2;
          const groupWidth = barWidth * series.length + gap * (series.length - 1);
          const startX = center - groupWidth / 2;
          return (
            <g key={label + i}>
              {series.map((s, si) => {
                const v = s.values[i] ?? 0;
                const barX = startX + si * (barWidth + gap);
                const barY = y(v);
                const barH = Math.max(y(0) - barY, v > 0 ? 1 : 0);
                return <rect key={s.name} x={barX} y={barY} width={barWidth} height={barH} rx={2.5} fill={s.color} />;
              })}
            </g>
          );
        })}
      </g>

      {labels.map((label, i) => {
        const center = PADDING.left + band * i + band / 2;
        return (
          <g key={label + i} className="group">
            {/* Foutenrapport M3: zie LineChart hierboven. */}
            <rect
              x={PADDING.left + band * i}
              y={PADDING.top}
              width={band}
              height={innerH}
              fill="transparent"
              tabIndex={0}
              role="img"
              aria-label={`${label}: ${series.map((s) => `${s.name} ${s.values[i] ?? 0}`).join(", ")}`}
            />
            {/* Foutenrapport H3: altijd align="center" liet de tooltip van de
                laatste kolom voorbij de rand van de SVG lopen en afgeknipt
                raken (standaard overflow:hidden) — zelfde edge-aware align
                als LineChart hierboven voor de eerste/laatste kolom. */}
            <ChartTooltip
              x={center}
              y={y(Math.max(...series.map((s) => s.values[i] ?? 0))) - 14 - series.length * 15}
              align={i === 0 ? "start" : i === labels.length - 1 ? "end" : "center"}
            >
              <span className="font-semibold">{label}</span>
              {series.map((s) => (
                <span key={s.name} className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}: {s.values[i] ?? 0}
                </span>
              ))}
            </ChartTooltip>
            {labelIdx.has(i) && (
              <AxisLabel x={center} y={height - 16} align={i === 0 ? "start" : i === labels.length - 1 ? "end" : "center"}>
                {label}
              </AxisLabel>
            )}
          </g>
        );
      })}
      </svg>
      <ChartSrTable labels={labels} series={series} />
    </>
  );
}

// Tiny inline sparkline voor KPI-tegels — puur decoratief, geen interactie.
export function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const w = 100;
  const h = 30;
  const max = Math.max(...values);
  const min0 = Math.min(...values);
  const range = Math.max(max - min0, max * 0.3) || 1;
  const min = max - range;
  const points = values.map((v, i) => [i * (w / (values.length - 1)), h - 3 - ((v - min) / range) * (h - 8)]);
  const path = points.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <svg viewBox={`-2 0 ${w + 4} ${h}`} preserveAspectRatio="none" className="mt-1 block h-[30px] w-full" aria-hidden="true">
      <path d={`${path} L${w} ${h} L0 ${h}Z`} fill={color} opacity={0.1} />
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r={2.6} fill={color} />
    </svg>
  );
}

export type BarRow = {
  id: string;
  label: string;
  sublabel?: string;
  value: number;
  secondary?: number;
  // undefined = geen max-concept voor deze lijst (branche/plaats, "wie komt
  // er"): balken zijn relatief aan elkaar. null = deze rij heeft zelf geen
  // maximum, binnen een lijst waar andere rijen dat wel hebben (bezetting
  // per activiteit zonder max_participants) — zie foutenrapport L2.
  max?: number | null;
  valueLabel: string;
  href?: string;
};

// Horizontale balken (bezetting per activiteit, branche/plaats, "wie komt
// er") — `secondary` tekent een tweede segment in een andere kleur
// (bv. wachtlijst) ná het eerste, binnen dezelfde track.
export function HorizontalBars({ rows, max: fixedMax }: { rows: BarRow[]; max?: number }) {
  if (rows.length === 0) return <p className="text-sm text-muted">Nog geen gegevens.</p>;
  // Foutenrapport L2: voorheen viel een rij zonder eigen max terug op haar
  // eigen waarde als max ("r.max ?? r.value + secondary"), waardoor die ene
  // rij altijd een volle balk kreeg — alsof hij vol zit, terwijl er
  // helemaal geen maximum is ingesteld. De schaal is nu voor alle rijen
  // hetzelfde: het hoogste áchte maximum in de lijst, of anders de hoogste
  // waarde (nooit de eigen waarde van een maxloze rij).
  const explicitMaxes = rows.map((r) => r.max).filter((m): m is number => typeof m === "number");
  const max = fixedMax ?? Math.max(...explicitMaxes, ...rows.map((r) => r.value + (r.secondary ?? 0)), 1);
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => {
        const noMax = row.max === null;
        const primaryPct = Math.min(100, (row.value / max) * 100);
        const secondaryPct = row.secondary ? Math.min(100 - primaryPct, (row.secondary / max) * 100) : 0;
        return (
          <div key={row.id} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] items-center gap-3 text-sm">
            <span className="min-w-0 truncate text-foreground">
              {row.href ? (
                <a href={row.href} className="hover:text-petrol hover:underline">
                  {row.label}
                </a>
              ) : (
                row.label
              )}
              {row.sublabel && <span className="ml-1.5 text-xs text-muted">{row.sublabel}</span>}
            </span>
            <span className="flex h-2.5 overflow-hidden rounded-full bg-raised">
              <span
                className="h-full rounded-l-full"
                style={{ width: `${primaryPct}%`, backgroundColor: noMax ? "var(--muted)" : "var(--chart-primary)", opacity: noMax ? 0.5 : 1 }}
              />
              {secondaryPct > 0 && <span className="h-full" style={{ width: `${secondaryPct}%`, backgroundColor: "var(--chart-secondary)" }} />}
            </span>
            <span className="whitespace-nowrap text-right font-semibold text-foreground tabular-nums">
              {row.valueLabel}
              {row.secondary ? <small className="ml-1 block text-[11px] font-medium" style={{ color: "var(--chart-secondary)" }}>+{row.secondary} wachtlijst</small> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Trechter met percentage t.o.v. de vorige stap.
// Foutenrapport H1: de breedte ging voorheen uit van steps[0] als het
// grootste getal, en het percentage van de vórige stap — klopt geen van
// beide zodra een latere stap groter is dan de eerste (geen echte trechter),
// wat zowel een balk van 300-400% breed (horizontale scroll over de hele
// pagina) als percentages als "800%" opleverde. Nu: breedte geschaald op
// het werkelijke maximum over alle stappen en geklemd op 100%; percentage
// altijd t.o.v. stap 1 (ook geklemd), en helemaal niet getoond voor een
// stap die zelf is gemarkeerd als geen echte deelverzameling (notSubset).
export function FunnelChart({ steps }: { steps: { label: string; value: number; notSubset?: boolean }[] }) {
  const max = Math.max(...steps.map((s) => s.value), 1);
  const first = steps[0]?.value ?? 0;
  return (
    <div className="flex flex-col gap-2.5">
      {steps.map((s, i) => {
        const width = Math.min(100, Math.max((s.value / max) * 100, s.value > 0 ? 4 : 0));
        const showPct = i > 0 && !s.notSubset && first > 0;
        const pct = showPct ? Math.min(100, Math.round((s.value / first) * 100)) : null;
        return (
          <div key={s.label} className="grid grid-cols-[130px_minmax(0,1fr)_72px] items-center gap-3 text-sm">
            <span className="min-w-0 truncate text-muted">{s.label}</span>
            <div
              className="h-[26px] min-w-1 rounded-md"
              style={{ width: `${width}%`, backgroundColor: "var(--chart-primary)", opacity: 1 - i * 0.12 }}
            />
            <span className="whitespace-nowrap text-right">
              <span className="font-display text-base font-extrabold tabular-nums text-foreground">{s.value}</span>
              {pct !== null && <small className="ml-1 text-xs text-muted">{pct}%</small>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-3.5 text-xs text-muted">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className={clsx("inline-block h-[3px] w-3.5 rounded-sm", item.dashed && "opacity-60")}
            style={item.dashed ? { backgroundImage: `repeating-linear-gradient(90deg, ${item.color} 0 4px, transparent 4px 7px)` } : { backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
