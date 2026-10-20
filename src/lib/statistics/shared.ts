import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { cachedQuery, invalidateQuery } from "@/lib/cache/queryCache";
import type { Bucket, PeriodRange } from "./period";
import { buildBuckets, countByBucket, uniqueCountByBucket, PERIOD_OPTIONS } from "./period";

export const STATS_TTL_MS = 60_000;

// Aangeroepen vanuit agenda/actions.ts na elke wijziging die de
// activiteiten-cijfers raakt (aanmelden/afmelden/goedkeuren/etc.) — zonder
// dit liepen die tot 60s achter. Ruimt zowel het Activiteiten-tabblad als
// Overzicht op (dat toont ook bezetting/aanmeldingen), voor alle vijf
// periodevarianten tegelijk, net als de oude invalidateActivityStatsCache.
export function invalidateActivityStatsCache(): void {
  for (const { key } of PERIOD_OPTIONS) {
    invalidateQuery(`statistieken-activiteiten-${key}`);
    invalidateQuery(`statistieken-overzicht-${key}`);
  }
}

export type OccupancyRow = {
  id: string;
  title: string;
  href: string;
  value: number;
  max: number | null;
  waitlist: number;
  subtitle: string;
};

export type Kpi = {
  label: string;
  value: number;
  unit?: string;
  /** null = geen vergelijkingscijfer beschikbaar (nooit tonen als "0"). */
  previousValue: number | null;
  sparkline?: number[];
  /** Vaste subtekst i.p.v. "t.o.v. <vorige periode>", voor een cijfer dat niet
   * periodegebonden is (bv. "van alle 124 leden"). */
  note?: string;
};

// list_push_subscriptions (0041) is de enige manier om de volledige
// pushabonnementenlijst te lezen (push_subscriptions zelf is eigenaar-only
// RLS) — hergebruikt en gecachet, want meerdere tabbladen hebben 'm nodig.
export async function getAllPushSubscriptions(
  supabase: SupabaseClient<Database>
): Promise<{ profile_id: string; created_at: string }[]> {
  return cachedQuery("statistieken-push-subscriptions", STATS_TTL_MS, async () => {
    const { data } = await supabase.rpc("list_push_subscriptions");
    return data ?? [];
  });
}

export function pctDelta(value: number, previous: number | null): number | null {
  return previous === null ? null : value - previous;
}

// Unieke "iets gedaan"-telling per periodevak, gereconstrueerd uit elke
// tabel/log met een profile_id + created_at die een echte handeling van een
// lid vastlegt (geen aparte "sessie"-log bestaat — profiles.last_active_at
// is één rollend tijdstip zonder geschiedenis, dus niet terug te rekenen
// naar eerdere periodes). Breder dan alleen `events`: ook aanmeldingen,
// berichten en reacties tellen als "actief", niet alleen bekeken-events.
export async function getActivityRows(
  supabase: SupabaseClient<Database>,
  since: Date
): Promise<{ profile_id: string; created_at: string }[]> {
  const sinceIso = since.toISOString();
  const [{ data: events }, { data: registrations }, { data: posts }, { data: comments }] = await Promise.all([
    supabase.from("events").select("profile_id, created_at").not("profile_id", "is", null).gte("created_at", sinceIso),
    supabase.from("activity_registrations").select("profile_id, created_at").gte("created_at", sinceIso),
    supabase.from("feed_posts").select("author_id, created_at").gte("created_at", sinceIso),
    supabase.from("feed_comments").select("author_id, created_at").gte("created_at", sinceIso),
  ]);
  return [
    ...(events ?? []).map((r) => ({ profile_id: r.profile_id as string, created_at: r.created_at })),
    ...(registrations ?? []).map((r) => ({ profile_id: r.profile_id, created_at: r.created_at })),
    ...(posts ?? []).map((r) => ({ profile_id: r.author_id, created_at: r.created_at })),
    ...(comments ?? []).map((r) => ({ profile_id: r.author_id, created_at: r.created_at })),
  ];
}

export function bucketUniqueSeries(
  rows: { profile_id: string; created_at: string }[],
  buckets: Bucket[]
): { key: string; label: string; value: number }[] {
  const values = uniqueCountByBucket(rows.map((r) => ({ profile_id: r.profile_id, created_at: r.created_at })), buckets);
  return buckets.map((b, i) => ({ key: b.key, label: b.label, value: values[i] ?? 0 }));
}

export function bucketCountSeries(dates: string[], buckets: Bucket[]): { key: string; label: string; value: number }[] {
  const values = countByBucket(dates, buckets);
  return buckets.map((b, i) => ({ key: b.key, label: b.label, value: values[i] ?? 0 }));
}

export function bucketsFor(range: PeriodRange): Bucket[] {
  return buildBuckets(range);
}

// Twee reeksen (huidige + vorige periode) op dezelfde as — de vorige reeks
// krijgt dezelfde bucket-labels als de huidige (niet zijn eigen datums), zodat
// ze in de grafiek precies naast elkaar vallen ("dag 1 van deze periode" naast
// "dag 1 van de vorige periode").
export function alignPreviousSeries(previousValues: number[], currentBuckets: Bucket[]): { key: string; label: string; value: number }[] {
  return currentBuckets.map((b, i) => ({ key: `prev-${b.key}`, label: b.label, value: previousValues[i] ?? 0 }));
}
