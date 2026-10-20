import "server-only";

import { createClient } from "@/lib/supabase/server";
import { cachedQuery } from "@/lib/cache/queryCache";
import { activityHref } from "@/lib/agenda/slug";
import { resolvePeriodRange, type PeriodRange, type TrendPoint } from "./period";
import {
  getAllPushSubscriptions,
  getActivityRows,
  bucketUniqueSeries,
  bucketsFor,
  alignPreviousSeries,
  type Kpi,
  type OccupancyRow,
} from "./shared";

const TTL_MS = 60_000;

// Foutenrapport H1: notSubset markeert een stap die geen echte deelverzameling
// is van de vorige (bv. "nieuwe leden" telt ook geïmporteerde/uitgenodigde
// profielen, niet alleen wie via een toegangsaanvraag kwam) — FunnelChart
// toont dan geen (potentieel >100%) percentage voor die stap.
export type FunnelStep = { label: string; value: number; notSubset?: boolean };

export type SignalItem = {
  label: string;
  sublabel: string;
  count: number;
  tone: "warning" | "neutral" | "good";
  href?: string;
};

export type OverviewStats = {
  kpis: {
    leden: Kpi;
    actieveLeden: Kpi;
    aanmeldingen: Kpi;
    uniekeDeelnemers: Kpi;
    berichten: Kpi;
    nieuwsbriefAfgeleverd: Kpi;
  };
  activeMembersTrend: TrendPoint[];
  activeMembersTrendPrev: TrendPoint[];
  instroom: FunnelStep[];
  activiteiten: OccupancyRow[];
  signalen: SignalItem[];
  ledenontwikkeling: { key: string; label: string; nieuw: number; uitgeschreven: number }[];
  bereik: {
    laatsteNieuwsbrief: { afgeleverd: number; ontvangers: number; mislukt: number; onderwerp: string } | null;
    pushPercentage: number;
    pushCount: number;
    activeMemberCount: number;
    communityPosts: number;
    communityComments: number;
    meestGelezenTitel: string | null;
  };
};

export async function getOverviewStats(range: PeriodRange): Promise<OverviewStats> {
  const supabase = await createClient();
  return cachedQuery(`statistieken-overzicht-${range.period}`, TTL_MS, async () => {
    const buckets = bucketsFor(range);

    const [
      { count: totalMembers },
      { count: totalMembersPrev },
      { count: aanmeldingen },
      { count: aanmeldingenPrev },
      { data: registrationsForUnique },
      { data: registrationsForUniquePrev },
      { count: berichten },
      { count: berichtenPrev },
      { count: reacties },
      { count: reactiesPrev },
      activityRows,
      pushSubscriptions,
      { count: activeMemberCount },
      { count: websiteSignupsCount },
      { count: prospectsCount },
      { count: accessRequestsCount },
      { count: newMembersCount },
      { data: upcomingActivities },
      { data: incompleteCandidates },
      { data: linkedProfiles },
      { count: staleLoginCount },
      { data: neverAttendedRows },
      { data: deliveriesLatest },
      { count: communityPostsPeriodCount },
      { data: topPostEvents },
      { data: newMembersByMonth },
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).lt("created_at", range.end.toISOString()),
      supabase.from("profiles").select("id", { count: "exact", head: true }).lt("created_at", range.prevEnd.toISOString()),
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
        .from("feed_posts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", range.start.toISOString())
        .lt("created_at", range.end.toISOString()),
      supabase
        .from("feed_posts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", range.prevStart.toISOString())
        .lt("created_at", range.prevEnd.toISOString()),
      supabase
        .from("feed_comments")
        .select("id", { count: "exact", head: true })
        .gte("created_at", range.start.toISOString())
        .lt("created_at", range.end.toISOString()),
      supabase
        .from("feed_comments")
        .select("id", { count: "exact", head: true })
        .gte("created_at", range.prevStart.toISOString())
        .lt("created_at", range.prevEnd.toISOString()),
      // Foutenrapport H2/M13: vanaf prevStart i.p.v. range.start ophalen —
      // dekt meteen ook de vorige periode, dus de losse tweede aanroep
      // verderop (voorheen prevRows) kan vervallen. Dezelfde dataset wordt
      // hieronder gebruikt voor zowel de "Actieve leden"-KPI als de trend.
      getActivityRows(supabase, range.prevStart),
      getAllPushSubscriptions(supabase),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase
        .from("public_activity_registrations")
        .select("id", { count: "exact", head: true })
        .gte("created_at", range.start.toISOString())
        .lt("created_at", range.end.toISOString()),
      supabase
        .from("prospects")
        .select("id", { count: "exact", head: true })
        .gte("first_seen_at", range.start.toISOString())
        .lt("first_seen_at", range.end.toISOString()),
      supabase
        .from("access_requests")
        .select("id", { count: "exact", head: true })
        .gte("created_at", range.start.toISOString())
        .lt("created_at", range.end.toISOString()),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", range.start.toISOString())
        .lt("created_at", range.end.toISOString()),
      supabase
        .from("activities")
        .select("id, title, slug, max_participants, starts_at")
        .eq("status", "approved")
        .gte("starts_at", range.start.toISOString())
        .lt("starts_at", range.end.toISOString())
        .order("starts_at", { ascending: true }),
      supabase.from("profiles").select("id, avatar_url").eq("is_active", true),
      supabase.from("company_members").select("profile_id"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .or(`last_active_at.is.null,last_active_at.lt.${new Date(Date.now() - 90 * 86400000).toISOString()}`),
      supabase
        .from("activity_registrations")
        .select("profile_id")
        .eq("attended", true)
        .gte("created_at", new Date(Date.now() - 365 * 86400000).toISOString()),
      supabase
        .from("communications")
        .select("subject, communication_deliveries(status)")
        .eq("status", "verzonden")
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("feed_posts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", range.start.toISOString())
        .lt("created_at", range.end.toISOString()),
      supabase
        .from("events")
        .select("target_id")
        .eq("event_type", "post_viewed")
        .gte("created_at", range.start.toISOString()),
      supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", new Date(Date.now() - 365 * 86400000).toISOString()),
    ]);

    // ---- KPI's ----
    const uniqueDeelnemersSet = new Set((registrationsForUnique ?? []).map((r) => r.profile_id).filter(Boolean));
    const uniqueDeelnemersPrevSet = new Set((registrationsForUniquePrev ?? []).map((r) => r.profile_id).filter(Boolean));

    const pushUniqueMembers = new Set(pushSubscriptions.map((s) => s.profile_id)).size;
    const pushPercentage = activeMemberCount ? Math.round((pushUniqueMembers / activeMemberCount) * 100) : 0;

    const newsletterDeliveries = (deliveriesLatest?.communication_deliveries ?? []) as { status: string }[];
    const newsletterDelivered = newsletterDeliveries.filter((d) => d.status === "verstuurd").length;
    const newsletterTotal = newsletterDeliveries.length;
    const newsletterPct = newsletterTotal > 0 ? Math.round((newsletterDelivered / newsletterTotal) * 100) : null;

    // Foutenrapport H2: "Actieve leden" rekende voorheen met last_active_at
    // (één rollend tijdstip, geen geschiedenis) — wie vandaag actief was telt
    // daardoor nooit mee in de vorige periode, en de vorige periode kwam
    // altijd op ~0% uit. Nu dezelfde reconstructie als de trendgrafiek
    // eronder (unieke profile_id's uit events/aanmeldingen/posts/reacties).
    const activeInRange = new Set(
      activityRows
        .filter((r) => {
          const t = new Date(r.created_at).getTime();
          return t >= range.start.getTime() && t < range.end.getTime();
        })
        .map((r) => r.profile_id)
    ).size;
    const activeInPrevRange = new Set(
      activityRows
        .filter((r) => {
          const t = new Date(r.created_at).getTime();
          return t >= range.prevStart.getTime() && t < range.prevEnd.getTime();
        })
        .map((r) => r.profile_id)
    ).size;

    const kpis: OverviewStats["kpis"] = {
      leden: {
        label: "Leden",
        value: totalMembers ?? 0,
        previousValue: totalMembersPrev ?? 0,
        sparkline: cumulativeMemberSparkline(buckets.length, totalMembersPrev ?? 0, totalMembers ?? 0),
      },
      actieveLeden: {
        label: "Actieve leden",
        value: activeMemberCount ? Math.round((activeInRange / activeMemberCount) * 100) : 0,
        unit: "%",
        previousValue: activeMemberCount ? Math.round((activeInPrevRange / activeMemberCount) * 100) : 0,
      },
      aanmeldingen: {
        label: "Aanmeldingen activiteiten",
        value: aanmeldingen ?? 0,
        previousValue: aanmeldingenPrev ?? 0,
      },
      uniekeDeelnemers: {
        label: "Unieke deelnemers",
        value: uniqueDeelnemersSet.size,
        previousValue: uniqueDeelnemersPrevSet.size,
      },
      berichten: {
        label: "Berichten en reacties",
        value: (berichten ?? 0) + (reacties ?? 0),
        previousValue: (berichtenPrev ?? 0) + (reactiesPrev ?? 0),
      },
      nieuwsbriefAfgeleverd: {
        label: "Nieuwsbrief afgeleverd",
        value: newsletterPct ?? 0,
        unit: "%",
        previousValue: null,
        note: newsletterPct === null ? "nog geen nieuwsbrief verstuurd" : "laatst verstuurde nieuwsbrief",
      },
    };

    // ---- Actieve leden-trend (reconstructie uit timestamped acties, zie
    // shared.ts — last_active_at zelf heeft geen geschiedenis) ----
    // Foutenrapport M13: activityRows dekt nu al vanaf prevStart (zie de
    // getActivityRows-aanroep hierboven), dus geen tweede, overlappende
    // fetch meer nodig voor de vorige periode — bucketUniqueSeries/
    // uniqueCountByBucket negeren rijen die buiten alle buckets vallen toch
    // al, dus dezelfde rijenlijst volstaat voor beide reeksen.
    const activeMembersTrend = bucketUniqueSeries(activityRows, buckets);

    const prevBuckets = bucketsFor({ ...range, start: range.prevStart, end: range.prevEnd });
    const prevSeries = bucketUniqueSeries(activityRows, prevBuckets);
    const activeMembersTrendPrev: TrendPoint[] = alignPreviousSeries(
      prevSeries.map((p) => p.value),
      buckets
    );

    // ---- Instroom-trechter ----
    const instroom: FunnelStep[] = [
      { label: "Aanmelding via website", value: websiteSignupsCount ?? 0 },
      { label: "Nieuwe prospect", value: prospectsCount ?? 0 },
      { label: "Toegangsaanvraag", value: accessRequestsCount ?? 0 },
      // Foutenrapport H1: dit telt élk nieuw profiel in de periode, ook
      // geïmporteerde of rechtstreeks uitgenodigde leden — niet alleen wie
      // via de stappen hiervoor kwam. Geen echte deelverzameling van
      // "Toegangsaanvraag", dus geen percentage (kon anders "800%" tonen).
      { label: "Nieuwe leden (alle bronnen)", value: newMembersCount ?? 0, notSubset: true },
    ];

    // ---- Activiteiten in deze periode (bezetting) ----
    // Geen geneste select (activities -> activity_registrations): die
    // reverse-relatie staat niet in de (handmatig bijgehouden) database-
    // types, dus hier gewoon een losse, tweede query en in JS gegroepeerd —
    // zelfde patroon als de oude getActivityStats.
    const upcomingActivityIds = (upcomingActivities ?? []).map((a) => a.id);
    const { data: upcomingRegistrations } =
      upcomingActivityIds.length > 0
        ? await supabase.from("activity_registrations").select("activity_id, is_waitlisted").in("activity_id", upcomingActivityIds)
        : { data: [] as { activity_id: string; is_waitlisted: boolean }[] };
    const registrationsByActivityId = new Map<string, { is_waitlisted: boolean }[]>();
    for (const r of upcomingRegistrations ?? []) {
      const list = registrationsByActivityId.get(r.activity_id) ?? [];
      list.push({ is_waitlisted: r.is_waitlisted });
      registrationsByActivityId.set(r.activity_id, list);
    }

    const activiteiten: OccupancyRow[] = (upcomingActivities ?? [])
      .map((a) => {
        const regs = registrationsByActivityId.get(a.id) ?? [];
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
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // ---- Signalen ----
    const avatarByProfile = new Map((incompleteCandidates ?? []).map((p) => [p.id, Boolean(p.avatar_url)]));
    const linkedProfileIds = new Set((linkedProfiles ?? []).map((l) => l.profile_id));
    const incompleteCount = [...avatarByProfile.entries()].filter(([id, hasAvatar]) => !hasAvatar || !linkedProfileIds.has(id)).length;
    const attendedProfileIds = new Set((neverAttendedRows ?? []).map((r) => r.profile_id));
    const neverAttendedCount = [...avatarByProfile.keys()].filter((id) => !attendedProfileIds.has(id)).length;
    const fullActivity = (upcomingActivities ?? []).find((a) => (registrationsByActivityId.get(a.id) ?? []).some((r) => r.is_waitlisted));

    const signalen: SignalItem[] = [
      ...((staleLoginCount ?? 0) > 0
        ? [
            {
              label: "Niet ingelogd, 90+ dagen",
              sublabel: "Misschien een persoonlijke herinnering",
              count: staleLoginCount ?? 0,
              tone: "warning" as const,
              // Foutenrapport H4: linkte voorheen naar een ongefilterde
              // ledenlijst — nu een filter die exact dezelfde definitie
              // gebruikt als hierboven (zie BeheerLedenListClient.tsx).
              href: "/beheer/leden?signaal=inactief90",
            },
          ]
        : []),
      ...(incompleteCount > 0
        ? [
            {
              label: "Profiel incompleet",
              sublabel: "Geen foto of nog niet aan een bedrijf gekoppeld",
              count: incompleteCount,
              tone: "warning" as const,
              href: "/beheer/leden?signaal=incompleet",
            },
          ]
        : []),
      ...(neverAttendedCount > 0
        ? [
            {
              label: "Nooit naar een activiteit (12 mnd)",
              sublabel: "Goede doelgroep voor de volgende uitnodiging",
              count: neverAttendedCount,
              tone: "neutral" as const,
              href: "/beheer/leden?signaal=nooit",
            },
          ]
        : []),
      ...(fullActivity
        ? [
            {
              label: `"${fullActivity.title}" vol`,
              sublabel: "Staat op de wachtlijst — misschien een tweede datum",
              count: (registrationsByActivityId.get(fullActivity.id) ?? []).filter((r) => r.is_waitlisted).length,
              tone: "good" as const,
              href: activityHref(fullActivity),
            },
          ]
        : []),
    ];

    // ---- Ledenontwikkeling (vaste laatste 12 maanden, los van de
    // periodekeuze — zelfde als het klikbare voorbeeld) ----
    // Foutenrapport H3: "nu - 365 dagen" snapt via buildBuckets naar het
    // begin van die maand, en omdat "nu" meestal niet op de 1e van de maand
    // valt, ontstonden zo 13 in plaats van 12 maandvakken (dezelfde maand
    // twee keer, een jaar uit elkaar). resolvePeriodRange("12m") levert al
    // precies het begin van de maand 11 maanden terug.
    const twelveMonthsAgo = resolvePeriodRange("12m").start;
    const twelveMoBuckets = bucketsFor({
      period: "12m",
      start: twelveMonthsAgo,
      end: new Date(),
      prevStart: twelveMonthsAgo,
      prevEnd: new Date(),
      granularity: "month",
    });
    const newByMonth = countMonthly((newMembersByMonth ?? []).map((r) => r.created_at), twelveMoBuckets);
    const ledenontwikkeling = twelveMoBuckets.map((b, i) => ({
      key: b.key,
      label: b.label,
      nieuw: newByMonth[i] ?? 0,
      uitgeschreven: 0,
    }));
    // Uitgeschreven per maand apart opgehaald (head-only count hierboven gaf
    // enkel een totaal) — zie members.ts voor dezelfde, volledige berekening;
    // hier een lichte variant puur voor de maandstaafjes.
    const { data: deactivatedDates } = await supabase
      .from("profiles")
      .select("deactivated_at")
      .not("deactivated_at", "is", null)
      .gte("deactivated_at", twelveMonthsAgo.toISOString());
    const uitgeschrevenByMonth = countMonthly(
      (deactivatedDates ?? []).map((r) => r.deactivated_at as string),
      twelveMoBuckets
    );
    ledenontwikkeling.forEach((row, i) => {
      row.uitgeschreven = uitgeschrevenByMonth[i] ?? 0;
    });

    const topPostId = mostViewedPostId(topPostEvents);
    let meestGelezenTitel: string | null = null;
    if (topPostId) {
      const { data: topPostRow } = await supabase.from("feed_posts").select("content").eq("id", topPostId).maybeSingle();
      meestGelezenTitel = topPostRow?.content?.slice(0, 60) || "(bericht zonder tekst)";
    }

    return {
      kpis,
      activeMembersTrend,
      activeMembersTrendPrev,
      instroom,
      activiteiten,
      signalen,
      ledenontwikkeling,
      bereik: {
        laatsteNieuwsbrief: deliveriesLatest
          ? {
              afgeleverd: newsletterDelivered,
              ontvangers: newsletterTotal,
              mislukt: newsletterDeliveries.filter((d) => d.status === "mislukt").length,
              onderwerp: deliveriesLatest.subject,
            }
          : null,
        pushPercentage,
        pushCount: pushUniqueMembers,
        activeMemberCount: activeMemberCount ?? 0,
        communityPosts: communityPostsPeriodCount ?? 0,
        communityComments: reacties ?? 0,
        meestGelezenTitel,
      },
    };
  });
}

function cumulativeMemberSparkline(points: number, start: number, end: number): number[] {
  if (points <= 1) return [start, end];
  const step = (end - start) / (points - 1);
  return Array.from({ length: points }, (_, i) => Math.round(start + step * i));
}

function countMonthly(dates: string[], buckets: { start: Date; end: Date }[]): number[] {
  const counts = new Array(buckets.length).fill(0);
  for (const iso of dates) {
    const t = new Date(iso).getTime();
    const idx = buckets.findIndex((b) => t >= b.start.getTime() && t < b.end.getTime());
    if (idx !== -1) counts[idx] += 1;
  }
  return counts;
}

function mostViewedPostId(rows: { target_id: string | null }[] | null): string | null {
  if (!rows || rows.length === 0) return null;
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.target_id) continue;
    counts.set(r.target_id, (counts.get(r.target_id) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      best = id;
      bestCount = count;
    }
  }
  return best;
}
