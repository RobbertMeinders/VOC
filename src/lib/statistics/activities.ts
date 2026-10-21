import "server-only";

import { createClient } from "@/lib/supabase/server";
import { cachedQuery } from "@/lib/cache/queryCache";
import { activityHref } from "@/lib/agenda/slug";
import type { PeriodRange } from "./period";
import { buildBuckets, resolvePeriodRange } from "./period";
import { getRegistrationCountsByProfile, type Kpi, type OccupancyRow } from "./shared";

const TTL_MS = 60_000;

export type ActivitiesStats = {
  kpis: {
    aanmeldingen: Kpi;
    gemiddeldeBezetting: Kpi;
    uniekeDeelnemers: Kpi;
    bereik: Kpi;
  };
  bezetting: OccupancyRow[];
  wieKomtEr: { label: string; value: number }[];
  aanmeldingenPerMaand: { key: string; label: string; leden: number; gasten: number }[];
};

export async function getActivitiesStats(range: PeriodRange): Promise<ActivitiesStats> {
  const supabase = await createClient();
  return cachedQuery(`statistieken-activiteiten-${range.period}`, TTL_MS, async () => {
    // Foutenrapport H3: "nu - 365 dagen" gaf, na het snappen naar het begin
    // van de maand in buildBuckets, 13 i.p.v. 12 maandvakken.
    const twelveMonthsAgo = resolvePeriodRange("12m").start;

    const [
      { data: activeProfiles },
      { data: periodActivities },
      { data: periodRegistrationsForUnique },
      { data: prevPeriodRegistrationsForUnique },
      { count: registrationsCount },
      { count: registrationsCountPrev },
      registrationCountsByProfile,
      { data: memberRegsByMonth },
      { data: guestRegsByMonth },
    ] = await Promise.all([
      // Foutenrapport M4: de volledige id-lijst (i.p.v. alleen een head-
      // count) is nodig om "Wie komt er?" exact te kunnen partitioneren op
      // actieve leden — anders kan een gedeactiveerd lid dat ooit
      // aanmeldde de telling scheeftrekken.
      supabase.from("profiles").select("id").eq("is_active", true),
      supabase
        .from("activities")
        .select("id, title, slug, max_participants, starts_at")
        .eq("status", "approved")
        .gte("starts_at", range.start.toISOString())
        .lt("starts_at", range.end.toISOString())
        .order("starts_at", { ascending: true }),
      supabase
        .from("activity_registrations")
        .select("profile_id, created_at")
        .gte("created_at", range.start.toISOString())
        .lt("created_at", range.end.toISOString()),
      supabase
        .from("activity_registrations")
        .select("profile_id, created_at")
        .gte("created_at", range.prevStart.toISOString())
        .lt("created_at", range.prevEnd.toISOString()),
      supabase
        .from("activity_registrations")
        .select("id", { count: "exact", head: true })
        .gte("created_at", range.start.toISOString())
        .lt("created_at", range.end.toISOString()),
      supabase
        .from("activity_registrations")
        .select("id", { count: "exact", head: true })
        .gte("created_at", range.prevStart.toISOString())
        .lt("created_at", range.prevEnd.toISOString()),
      // Foutenrapport M4/M12: zelfde definitie en SQL-side telling als het
      // signaal "Nooit naar een activiteit" op Overzicht (overview.ts) —
      // aanmelding zonder wachtlijst, i.p.v. hier op opkomst (attended) en
      // daar op een andere, bredere set te filteren.
      getRegistrationCountsByProfile(supabase, twelveMonthsAgo),
      supabase.from("activity_registrations").select("profile_id, created_at").gte("created_at", twelveMonthsAgo.toISOString()),
      supabase.from("public_activity_registrations").select("created_at").gte("created_at", twelveMonthsAgo.toISOString()),
    ]);

    // ---- Bezetting per activiteit (periode) ----
    const periodActivityIds = (periodActivities ?? []).map((a) => a.id);
    const { data: periodRegsAll } =
      periodActivityIds.length > 0
        ? await supabase.from("activity_registrations").select("activity_id, is_waitlisted").in("activity_id", periodActivityIds)
        : { data: [] as { activity_id: string; is_waitlisted: boolean }[] };
    const regsByActivity = new Map<string, { is_waitlisted: boolean }[]>();
    for (const r of periodRegsAll ?? []) {
      const list = regsByActivity.get(r.activity_id) ?? [];
      list.push({ is_waitlisted: r.is_waitlisted });
      regsByActivity.set(r.activity_id, list);
    }
    const bezetting: OccupancyRow[] = (periodActivities ?? [])
      .map((a) => {
        const regs = regsByActivity.get(a.id) ?? [];
        const confirmed = regs.filter((r) => !r.is_waitlisted).length;
        const waitlist = regs.filter((r) => r.is_waitlisted).length;
        return {
          id: a.id,
          title: a.title,
          href: activityHref(a),
          value: confirmed,
          max: a.max_participants,
          waitlist,
          subtitle: a.max_participants ? `${confirmed} / ${a.max_participants}` : `${confirmed} aanmelding${confirmed === 1 ? "" : "en"}`,
          startsAt: a.starts_at,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Foutenrapport L1: 0% suggereert ten onrechte lege activiteiten als
    // geen enkele activiteit in de periode een maximum heeft ingesteld —
    // null laat de KPI-tegel "–" tonen in plaats van een misleidend getal.
    const occupancyRates = (periodActivities ?? [])
      .filter((a) => a.max_participants)
      .map((a) => {
        const regs = regsByActivity.get(a.id) ?? [];
        return (regs.filter((r) => !r.is_waitlisted).length / a.max_participants!) * 100;
      });
    const avgOccupancy =
      occupancyRates.length > 0 ? Math.round(occupancyRates.reduce((s, v) => s + v, 0) / occupancyRates.length) : null;

    // ---- Unieke deelnemers (periode) ----
    const uniqueNow = new Set((periodRegistrationsForUnique ?? []).map((r) => r.profile_id)).size;
    const uniquePrev = new Set((prevPeriodRegistrationsForUnique ?? []).map((r) => r.profile_id)).size;

    const activeProfileIds = new Set((activeProfiles ?? []).map((p) => p.id));
    const activeMemberCount = activeProfileIds.size;

    // ---- Bereik (12 mnd, leden die minstens één keer kwamen) ----
    // Foutenrapport M4: zelfde definitie (aanmelding zonder wachtlijst) en
    // bron (registrationCountsByProfile, shared.ts) als het signaal "Nooit
    // naar een activiteit" op Overzicht — voorheen gebruikte deze KPI
    // opkomst (attended) terwijl "Wie komt er?" hieronder op aanmeldingen
    // incl. wachtlijst en gedeactiveerde profielen telde, met twee
    // verschillende antwoorden op dezelfde vraag tot gevolg.
    const attendedActiveCount = [...activeProfileIds].filter((id) => registrationCountsByProfile.has(id)).length;
    const bereikPct = activeMemberCount ? Math.round((attendedActiveCount / activeMemberCount) * 100) : 0;

    // ---- Wie komt er (12 mnd): vaste bezoekers (3+), af en toe (1-2), nooit ----
    // Alleen actieve leden meegeteld (i.p.v. alle registranten, incl.
    // gedeactiveerde profielen) — anders kan deze driedeling meer dan
    // activeMemberCount optellen of "nooit" negatief maken.
    let vast = 0;
    let afEnToe = 0;
    for (const id of activeProfileIds) {
      const count = registrationCountsByProfile.get(id) ?? 0;
      if (count >= 3) vast += 1;
      else if (count >= 1) afEnToe += 1;
    }
    const nooit = activeMemberCount - vast - afEnToe;
    const wieKomtEr = [
      { label: "Vaste bezoekers (3+ keer)", value: vast },
      { label: "Af en toe (1-2 keer)", value: afEnToe },
      { label: "Nog nooit (12 mnd)", value: nooit },
    ];

    // ---- Aanmeldingen per maand: leden vs. gasten (vaste laatste 12 mnd) ----
    const twelveMoBuckets = buildBuckets({
      period: "12m",
      start: twelveMonthsAgo,
      end: new Date(),
      prevStart: twelveMonthsAgo,
      prevEnd: new Date(),
      granularity: "month",
    });
    const ledenByMonth = countByMonth((memberRegsByMonth ?? []).map((r) => r.created_at), twelveMoBuckets);
    const gastenByMonth = countByMonth((guestRegsByMonth ?? []).map((r) => r.created_at), twelveMoBuckets);
    const aanmeldingenPerMaand = twelveMoBuckets.map((b, i) => ({
      key: b.key,
      label: b.label,
      leden: ledenByMonth[i] ?? 0,
      gasten: gastenByMonth[i] ?? 0,
    }));

    return {
      kpis: {
        aanmeldingen: { label: "Aanmeldingen", value: registrationsCount ?? 0, previousValue: registrationsCountPrev ?? 0 },
        gemiddeldeBezetting: {
          label: "Gemiddelde bezetting",
          value: avgOccupancy,
          unit: "%",
          previousValue: null,
          note: avgOccupancy === null ? "geen activiteit met een maximum" : undefined,
        },
        uniekeDeelnemers: { label: "Unieke deelnemers", value: uniqueNow, previousValue: uniquePrev },
        bereik: {
          label: "Bereik: leden die kwamen",
          value: bereikPct,
          unit: "%",
          previousValue: null,
          note: "in 12 mnd",
        },
      },
      bezetting,
      wieKomtEr,
      aanmeldingenPerMaand,
    };
  });
}

function countByMonth(dates: string[], buckets: { start: Date; end: Date }[]): number[] {
  const counts = new Array(buckets.length).fill(0);
  for (const iso of dates) {
    const t = new Date(iso).getTime();
    const idx = buckets.findIndex((b) => t >= b.start.getTime() && t < b.end.getTime());
    if (idx !== -1) counts[idx] += 1;
  }
  return counts;
}
