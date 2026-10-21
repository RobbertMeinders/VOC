import "server-only";

import { createClient } from "@/lib/supabase/server";
import { cachedQuery } from "@/lib/cache/queryCache";
import type { PeriodRange } from "./period";
import { buildBuckets, resolvePeriodRange } from "./period";
import { getActiveMemberCountAsOf, type Kpi } from "./shared";

const TTL_MS = 60_000;

type CompanyMembershipRow = {
  profile_id: string;
  is_primary: boolean;
  company: { name: string; city: string | null; industry: string | null } | null;
};

export type MembersStats = {
  kpis: {
    leden: Kpi;
    nieuweLeden: Kpi;
    uitgeschreven: Kpi;
    profielCompleet: Kpi;
  };
  nieuwUitgeschrevenPerMaand: { key: string; label: string; nieuw: number; uitgeschreven: number }[];
  activatie: { label: string; value: number }[];
  perBranche: { label: string; value: number }[];
  perPlaats: { label: string; value: number }[];
};

export async function getMembersStats(range: PeriodRange): Promise<MembersStats> {
  const supabase = await createClient();
  return cachedQuery(`statistieken-leden-${range.period}`, TTL_MS, async () => {
    // Foutenrapport H3: "nu - 365 dagen" gaf, na het snappen naar het begin
    // van de maand in buildBuckets, 13 i.p.v. 12 maandvakken.
    const twelveMonthsAgo = resolvePeriodRange("12m").start;

    const [
      totalMembers,
      totalMembersPrev,
      { count: nieuweLeden },
      { count: nieuweLedenPrev },
      { count: uitgeschreven },
      { count: uitgeschrevenPrev },
      { data: activeProfiles },
      { data: linkedProfiles },
      { count: invitationsTotal },
      { count: profilesTotal },
      { count: activeLast30 },
      { data: newByMonthRows },
      { data: deactivatedByMonthRows },
    ] = await Promise.all([
      // Foutenrapport L6: "actief op moment X" i.p.v. elk ooit aangemaakt
      // profiel (ook al lang gedeactiveerde) te blijven meetellen.
      getActiveMemberCountAsOf(supabase, range.end),
      getActiveMemberCountAsOf(supabase, range.prevEnd),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", range.start.toISOString())
        .lt("created_at", range.end.toISOString()),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", range.prevStart.toISOString())
        .lt("created_at", range.prevEnd.toISOString()),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .not("deactivated_at", "is", null)
        .gte("deactivated_at", range.start.toISOString())
        .lt("deactivated_at", range.end.toISOString()),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .not("deactivated_at", "is", null)
        .gte("deactivated_at", range.prevStart.toISOString())
        .lt("deactivated_at", range.prevEnd.toISOString()),
      supabase.from("profiles").select("id, avatar_url").eq("is_active", true),
      supabase
        .from("company_members")
        .select("profile_id, is_primary, company:companies(name, city, industry)")
        .returns<CompanyMembershipRow[]>(),
      supabase.from("invitations").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .gte("last_active_at", new Date(Date.now() - 30 * 86400000).toISOString()),
      supabase.from("profiles").select("created_at").gte("created_at", twelveMonthsAgo.toISOString()),
      supabase
        .from("profiles")
        .select("deactivated_at")
        .not("deactivated_at", "is", null)
        .gte("deactivated_at", twelveMonthsAgo.toISOString()),
    ]);

    const linkedProfileIds = new Set((linkedProfiles ?? []).map((m) => m.profile_id));
    const activeProfileIds = new Set((activeProfiles ?? []).map((p) => p.id));
    const completeCount = (activeProfiles ?? []).filter((p) => p.avatar_url && linkedProfileIds.has(p.id)).length;
    const completePct = activeProfiles && activeProfiles.length > 0 ? Math.round((completeCount / activeProfiles.length) * 100) : 0;

    const kpis: MembersStats["kpis"] = {
      leden: { label: "Leden", value: totalMembers ?? 0, previousValue: totalMembersPrev ?? 0 },
      nieuweLeden: { label: "Nieuwe leden", value: nieuweLeden ?? 0, previousValue: nieuweLedenPrev ?? 0 },
      uitgeschreven: { label: "Uitgeschreven", value: uitgeschreven ?? 0, previousValue: uitgeschrevenPrev ?? 0 },
      profielCompleet: { label: "Profiel compleet", value: completePct, unit: "%", previousValue: null, note: "van alle actieve leden" },
    };

    const twelveMoBuckets = buildBuckets({
      period: "12m",
      start: twelveMonthsAgo,
      end: new Date(),
      prevStart: twelveMonthsAgo,
      prevEnd: new Date(),
      granularity: "month",
    });
    const nieuwByMonth = countByMonth((newByMonthRows ?? []).map((r) => r.created_at), twelveMoBuckets);
    const uitgeschrevenByMonth = countByMonth(
      (deactivatedByMonthRows ?? []).map((r) => r.deactivated_at as string),
      twelveMoBuckets
    );
    const nieuwUitgeschrevenPerMaand = twelveMoBuckets.map((b, i) => ({
      key: b.key,
      label: b.label,
      nieuw: nieuwByMonth[i] ?? 0,
      uitgeschreven: uitgeschrevenByMonth[i] ?? 0,
    }));

    // Activatietrechter: all-time, niet periodegebonden — zelfde als het
    // klikbare voorbeeld ("van alle leden").
    // Foutenrapport H1: "Profiel compleet" en "Actief, 30 dagen" stonden
    // omgewisseld — "profiel compleet" is geen subset van "actief, 30
    // dagen" (iemand kan actief zijn zonder compleet profiel), waardoor de
    // stap daarna een percentage ver boven 100% liet zien. Deze volgorde
    // (elke stap een logische deelverzameling van de vorige: wie actief
    // was, had al een account; wie een compleet profiel heeft, moet niet
    // per se de laatste 30 dagen actief zijn geweest) klopt wel.
    const activatie = [
      { label: "Uitgenodigd", value: invitationsTotal ?? 0 },
      { label: "Account aangemaakt", value: profilesTotal ?? 0 },
      { label: "Actief, 30 dagen", value: activeLast30 ?? 0 },
      { label: "Profiel compleet", value: completeCount },
    ];

    // Branche/plaats: via het primaire bedrijf van elk actief lid (of het
    // enige, als er geen primaire markering is) — all-time, geen
    // periodefilter (dit is "hoe is het netwerk samengesteld", geen trend).
    // Foutenrapport L7: het commentaar zei al "elk actief lid", maar de
    // code filterde linkedProfiles niet op is_active — een gedeactiveerd
    // lid met een bedrijfskoppeling telde hier dus gewoon mee.
    const primaryCompanyByProfile = new Map<string, { name: string; city: string | null; industry: string | null }>();
    for (const m of linkedProfiles ?? []) {
      if (!activeProfileIds.has(m.profile_id)) continue;
      const company = m.company;
      if (!company) continue;
      if (m.is_primary || !primaryCompanyByProfile.has(m.profile_id)) {
        primaryCompanyByProfile.set(m.profile_id, company);
      }
    }
    const brancheCounts = new Map<string, number>();
    const plaatsCounts = new Map<string, number>();
    for (const company of primaryCompanyByProfile.values()) {
      const branche = company.industry || "Overig";
      brancheCounts.set(branche, (brancheCounts.get(branche) ?? 0) + 1);
      if (company.city) plaatsCounts.set(company.city, (plaatsCounts.get(company.city) ?? 0) + 1);
    }

    return {
      kpis,
      nieuwUitgeschrevenPerMaand,
      activatie,
      perBranche: sortedEntries(brancheCounts),
      perPlaats: sortedEntries(plaatsCounts),
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

function sortedEntries(counts: Map<string, number>): { label: string; value: number }[] {
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
}
