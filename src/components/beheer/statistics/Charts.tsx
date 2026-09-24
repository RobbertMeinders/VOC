import type { MonthlyPoint } from "@/lib/statistics/queries";

// Lichte, rustige grafiekjes voor Statistieken — puur SVG, geen library,
// geen client-interactiviteit nodig (native <title> geeft een tooltip on
// hover). Bewust maar drie vormen: een lijn (cumulatief/percentage), een
// staafdiagram (1-2 reeksen per maand) en een trechter (3 stappen) — geen
// taartdiagrammen, geen dubbele y-as.

const CHART_HEIGHT = 160;
const CHART_WIDTH = 640;
const PADDING = { top: 12, right: 12, bottom: 24, left: 12 };

function sparseLabelIndexes(count: number, max = 6): Set<number> {
  if (count <= max) return new Set(Array.from({ length: count }, (_, i) => i));
  const step = Math.ceil(count / max);
  const set = new Set<number>();
  for (let i = 0; i < count; i += step) set.add(i);
  set.add(count - 1);
  return set;
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-[120px] items-center justify-center text-sm text-muted">
      {label}
    </div>
  );
}

export function LineTrend({
  points,
  emptyLabel = "Nog geen gegevens in deze periode.",
  suffix = "",
}: {
  points: MonthlyPoint[];
  emptyLabel?: string;
  suffix?: string;
}) {
  if (points.length === 0) return <Empty label={emptyLabel} />;

  const innerW = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const max = Math.max(...points.map((p) => p.value), 1);

  const x = (i: number) => (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW) + PADDING.left;
  const y = (v: number) => PADDING.top + innerH - (v / max) * innerH;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
  const areaPath = `${linePath} L${x(points.length - 1)},${PADDING.top + innerH} L${x(0)},${PADDING.top + innerH} Z`;
  const labelIdx = sparseLabelIndexes(points.length);
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full" role="img" aria-label="Trendgrafiek">
      <line
        x1={PADDING.left}
        y1={PADDING.top + innerH}
        x2={CHART_WIDTH - PADDING.right}
        y2={PADDING.top + innerH}
        stroke="var(--border)"
        strokeWidth={1}
      />
      <path d={areaPath} fill="var(--voc-red)" opacity={0.08} />
      <path d={linePath} fill="none" stroke="var(--voc-red)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={p.month} cx={x(i)} cy={y(p.value)} r={3} fill="var(--voc-red)">
          <title>
            {p.label}: {p.value}
            {suffix}
          </title>
        </circle>
      ))}
      <text x={x(points.length - 1)} y={y(last.value) - 8} textAnchor="end" fontSize={11} fontWeight={600} fill="var(--foreground)">
        {last.value}
        {suffix}
      </text>
      {points.map(
        (p, i) =>
          labelIdx.has(i) && (
            <text key={p.month} x={x(i)} y={CHART_HEIGHT - 6} textAnchor="middle" fontSize={10} fill="var(--muted)">
              {p.label}
            </text>
          )
      )}
    </svg>
  );
}

export function BarTrend({
  months,
  series,
  emptyLabel = "Nog geen gegevens in deze periode.",
}: {
  months: { month: string; label: string }[];
  series: { label: string; color: string; values: number[] }[];
  emptyLabel?: string;
}) {
  if (months.length === 0) return <Empty label={emptyLabel} />;

  const innerW = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const max = Math.max(...series.flatMap((s) => s.values), 1);
  const groupWidth = innerW / months.length;
  const barWidth = Math.min(22, (groupWidth * 0.6) / series.length);
  const labelIdx = sparseLabelIndexes(months.length);

  const y = (v: number) => PADDING.top + innerH - (v / max) * innerH;

  return (
    <div className="flex flex-col gap-2">
      {series.length > 1 && (
        <div className="flex gap-4 px-1">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5 text-xs text-muted">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full" role="img" aria-label="Staafdiagram per maand">
        <line
          x1={PADDING.left}
          y1={PADDING.top + innerH}
          x2={CHART_WIDTH - PADDING.right}
          y2={PADDING.top + innerH}
          stroke="var(--border)"
          strokeWidth={1}
        />
        {months.map((m, mi) => {
          const groupCenter = PADDING.left + groupWidth * mi + groupWidth / 2;
          const totalBarsWidth = barWidth * series.length + (series.length - 1) * 3;
          const startX = groupCenter - totalBarsWidth / 2;
          return (
            <g key={m.month}>
              {series.map((s, si) => {
                const v = s.values[mi] ?? 0;
                const barX = startX + si * (barWidth + 3);
                const barY = y(v);
                const barH = PADDING.top + innerH - barY;
                return (
                  <rect
                    key={s.label}
                    x={barX}
                    y={barH === 0 ? barY - 1 : barY}
                    width={barWidth}
                    height={Math.max(barH, 1)}
                    rx={2.5}
                    fill={s.color}
                  >
                    <title>
                      {m.label} — {s.label}: {v}
                    </title>
                  </rect>
                );
              })}
              {labelIdx.has(mi) && (
                <text x={groupCenter} y={CHART_HEIGHT - 6} textAnchor="middle" fontSize={10} fill="var(--muted)">
                  {m.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const max = Math.max(...steps.map((s) => s.value), 1);
  return (
    <div className="flex flex-col gap-3">
      {steps.map((s) => (
        <div key={s.label} className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-xs text-muted">{s.label}</span>
          <div className="h-6 flex-1 rounded-md bg-black/[.04] dark:bg-white/[.06]">
            <div
              className="h-full rounded-md bg-voc-red"
              style={{ width: `${Math.max((s.value / max) * 100, s.value > 0 ? 3 : 0)}%` }}
            />
          </div>
          <span className="w-12 shrink-0 text-right text-sm font-semibold text-foreground">{s.value}</span>
        </div>
      ))}
    </div>
  );
}
