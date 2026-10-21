// Geen "server-only" hier (in tegenstelling tot de andere statistics/
// bestanden): puur Date/Intl-logica, geen database/geheimen — en PeriodMenu
// (client component) heeft PERIOD_OPTIONS/StatsPeriod ook nodig.
//
// Statistieken-herbouw: één periodekeuze-knop i.p.v. een tweede rij losse
// periodeknoppen (zie de oude StatsPeriod in queries.ts, die nog "all" had
// i.p.v. "Dit jaar" en geen vergelijkingsperiode kende). Alle datums/
// periodegrenzen in Europe/Amsterdam, zoals geadviseerd in de nachtaudit.

export type StatsPeriod = "7d" | "30d" | "3m" | "12m" | "jaar";
export type Granularity = "day" | "week" | "month";

export const PERIOD_OPTIONS: { key: StatsPeriod; label: string }[] = [
  { key: "7d", label: "Laatste 7 dagen" },
  { key: "30d", label: "Laatste 30 dagen" },
  { key: "3m", label: "Laatste 3 maanden" },
  { key: "12m", label: "Laatste 12 maanden" },
  { key: "jaar", label: "Dit jaar" },
];

const DEFAULT_PERIOD: StatsPeriod = "30d";

export function resolvePeriod(value: string | undefined): StatsPeriod {
  return PERIOD_OPTIONS.some((p) => p.key === value) ? (value as StatsPeriod) : DEFAULT_PERIOD;
}

export function periodLabel(period: StatsPeriod): string {
  return PERIOD_OPTIONS.find((p) => p.key === period)?.label ?? period;
}

const PREV_LABEL: Record<StatsPeriod, string> = {
  "7d": "vorige 7 dagen",
  "30d": "vorige 30 dagen",
  "3m": "vorige 3 maanden",
  "12m": "jaar ervoor",
  jaar: "zelfde periode vorig jaar",
};

export function prevPeriodLabel(period: StatsPeriod): string {
  return PREV_LABEL[period];
}

export function granularityFor(period: StatsPeriod): Granularity {
  if (period === "7d" || period === "30d") return "day";
  if (period === "3m") return "week";
  return "month";
}

const TZ = "Europe/Amsterdam";

function amsterdamParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

// Foutenrapport M11: de oude correctie vergeleek alleen de Amsterdamse
// kálenderdatum van de UTC-middernacht-gok met de gewenste datum — UTC-
// middernacht valt in Amsterdam altijd nog op diezelfde datum (01:00 of
// 02:00 lokale tijd), dus die vergelijking was altijd 0 en deed in de
// praktijk niets. Periodegrenzen lagen daardoor steeds op UTC-middernacht
// i.p.v. Amsterdamse middernacht (acties tussen 00:00-02:00 lokale tijd
// vielen zo in de verkeerde dag/week/maand).
//
// Nu: de daadwerkelijke UTC-offset van Amsterdam op dat moment opvragen
// (+1 of +2 uur) en die aftrekken — werkt voor élke datum, DST-overgangen
// inbegrepen, zonder de gok-en-vergelijk-truc.
function amsterdamOffsetMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "longOffset" }).formatToParts(date);
  const offsetPart = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+00:00";
  const match = offsetPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = match[3] ? Number(match[3]) : 0;
  return sign * (hours * 60 + minutes);
}

function amsterdamMidnightUTC(year: number, month: number, day: number): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  return new Date(guess.getTime() - amsterdamOffsetMinutes(guess) * 60_000);
}

function amsterdamStartOfDay(date: Date): Date {
  const { year, month, day } = amsterdamParts(date);
  return amsterdamMidnightUTC(year, month, day);
}

function amsterdamStartOfMonth(date: Date): Date {
  const { year, month } = amsterdamParts(date);
  return amsterdamMidnightUTC(year, month, 1);
}

function amsterdamStartOfYear(date: Date): Date {
  const { year } = amsterdamParts(date);
  return amsterdamMidnightUTC(year, 1, 1);
}

// Maandag van de Amsterdamse kalenderweek waarin `date` valt.
function amsterdamStartOfWeek(date: Date): Date {
  const startOfDay = amsterdamStartOfDay(date);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(startOfDay);
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const offset = order.indexOf(weekday);
  const { year, month, day } = amsterdamParts(startOfDay);
  return amsterdamMidnightUTC(year, month, day - Math.max(offset, 0));
}

function addMonths(date: Date, n: number): Date {
  const { year, month, day } = amsterdamParts(date);
  return amsterdamMidnightUTC(year, month + n, day);
}

export type PeriodRange = {
  period: StatsPeriod;
  /** Start van de huidige periode (inclusief), in Amsterdam middernacht gesnapt. */
  start: Date;
  /** Nu — het eind van de huidige periode is altijd "nu", niet een afgeronde dag. */
  end: Date;
  /** Start/eind van de vergelijkingsperiode (zelfde lengte, direct ervoor — of
   *  bij "jaar": exact een jaar eerder). */
  prevStart: Date;
  prevEnd: Date;
  granularity: Granularity;
};

export function resolvePeriodRange(period: StatsPeriod, now: Date = new Date()): PeriodRange {
  const granularity = granularityFor(period);
  const end = now;

  if (period === "jaar") {
    const start = amsterdamStartOfYear(now);
    const prevStart = addMonths(start, -12);
    const prevEnd = addMonths(end, -12);
    return { period, start, end, prevStart, prevEnd, granularity };
  }

  // Foutenrapport L8: prevStart werd hieronder voorheen berekend als
  // `start - (end - start)` — "end" is altijd "nu" (nooit op een rond
  // tijdstip), dus die aftrek liet prevStart net als "now" op een
  // willekeurig moment middenin een dag/week vallen, i.p.v. op dezelfde
  // Amsterdamse dag-/week-/maandgrens als start zelf. prevEnd is wél
  // altijd gelijk aan start (die IS al gesnapt), dus prevStart nu met
  // dezelfde datum-aritmetiek als start zelf berekend — dan hebben beide
  // grenzen van de vorige periode gegarandeerd dezelfde uitlijning.
  if (period === "12m") {
    const start = addMonths(amsterdamStartOfMonth(now), -11);
    return { period, start, end, prevStart: addMonths(start, -12), prevEnd: start, granularity };
  }

  if (period === "3m") {
    const start = addDaysAmsterdam(amsterdamStartOfWeek(now), -12 * 7);
    return { period, start, end, prevStart: addDaysAmsterdam(start, -12 * 7), prevEnd: start, granularity };
  }

  const days = period === "7d" ? 7 : 30;
  const start = addDaysAmsterdam(amsterdamStartOfDay(now), -(days - 1));
  return { period, start, end, prevStart: addDaysAmsterdam(start, -days), prevEnd: start, granularity };
}

function addDaysAmsterdam(startOfDay: Date, days: number): Date {
  const { year, month, day } = amsterdamParts(startOfDay);
  return amsterdamMidnightUTC(year, month, day + days);
}

// Nette Nederlandse datumreeks onder de tabbladbalk, bv. "13 t/m 19 okt 2026"
// of "okt 2025 t/m okt 2026" — zelfde idee als het klikbare voorbeeld.
export function formatRangeLabel(range: PeriodRange): string {
  const fmtDay = (d: Date) => new Intl.DateTimeFormat("nl-NL", { timeZone: TZ, day: "numeric", month: "short" }).format(d);
  const fmtDayYear = (d: Date) =>
    new Intl.DateTimeFormat("nl-NL", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }).format(d);
  const fmtMonthYear = (d: Date) => new Intl.DateTimeFormat("nl-NL", { timeZone: TZ, month: "short", year: "numeric" }).format(d);

  if (range.granularity === "month") {
    return `${fmtMonthYear(range.start)} t/m ${fmtMonthYear(range.end)}`;
  }
  return `${fmtDay(range.start)} t/m ${fmtDayYear(range.end)}`;
}

// ---------------------------------------------------------------------------
// Bucketing: elke trendgrafiek deelt dezelfde periode op in dag/week/maand-
// vakken, ongeacht welke telling erin komt.
// ---------------------------------------------------------------------------

export type Bucket = { key: string; label: string; start: Date; end: Date };

function dayLabel(d: Date): string {
  return new Intl.DateTimeFormat("nl-NL", { timeZone: TZ, day: "numeric", month: "short" }).format(d);
}
function weekLabel(d: Date): string {
  // ISO-weeknummer, benaderd op de Amsterdamse kalenderdatum — "wk 42".
  const { year, month, day } = amsterdamParts(d);
  const target = new Date(Date.UTC(year, month - 1, day));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const weekNr = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `wk ${weekNr}`;
}
function monthLabel(d: Date): string {
  return new Intl.DateTimeFormat("nl-NL", { timeZone: TZ, month: "short" }).format(d);
}

export function buildBuckets(range: PeriodRange): Bucket[] {
  const buckets: Bucket[] = [];
  if (range.granularity === "day") {
    let cursor = amsterdamStartOfDay(range.start);
    while (cursor < range.end) {
      const next = addDaysAmsterdam(cursor, 1);
      buckets.push({ key: cursor.toISOString(), label: dayLabel(cursor), start: cursor, end: next });
      cursor = next;
    }
  } else if (range.granularity === "week") {
    let cursor = amsterdamStartOfWeek(range.start);
    while (cursor < range.end) {
      const next = addDaysAmsterdam(cursor, 7);
      buckets.push({ key: cursor.toISOString(), label: weekLabel(cursor), start: cursor, end: next });
      cursor = next;
    }
  } else {
    let cursor = amsterdamStartOfMonth(range.start);
    while (cursor < range.end) {
      const next = addMonths(cursor, 1);
      buckets.push({ key: cursor.toISOString(), label: monthLabel(cursor), start: cursor, end: next });
      cursor = next;
    }
  }
  return buckets;
}

// Telt ISO-datumstrings in de juiste vakken — lineaire scan (buckets blijven
// klein: hooguit 30 voor 7d/30d, 13 voor 3m, 12 voor 12m/jaar), geen aparte
// group-by-query nodig.
export function countByBucket(dates: string[], buckets: Bucket[]): number[] {
  const counts = new Array(buckets.length).fill(0);
  for (const iso of dates) {
    const t = new Date(iso).getTime();
    const idx = buckets.findIndex((b) => t >= b.start.getTime() && t < b.end.getTime());
    if (idx !== -1) counts[idx] += 1;
  }
  return counts;
}

export function uniqueCountByBucket(rows: { created_at: string; profile_id: string | null }[], buckets: Bucket[]): number[] {
  const sets = buckets.map(() => new Set<string>());
  for (const r of rows) {
    if (!r.profile_id) continue;
    const t = new Date(r.created_at).getTime();
    const idx = buckets.findIndex((b) => t >= b.start.getTime() && t < b.end.getTime());
    if (idx !== -1) sets[idx].add(r.profile_id);
  }
  return sets.map((s) => s.size);
}

export type TrendPoint = { key: string; label: string; value: number };

export function toTrendPoints(buckets: Bucket[], values: number[]): TrendPoint[] {
  return buckets.map((b, i) => ({ key: b.key, label: b.label, value: values[i] ?? 0 }));
}
