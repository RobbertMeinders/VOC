import "server-only";

import { createClient } from "@/lib/supabase/server";
import { cachedQuery } from "@/lib/cache/queryCache";

// Zelfde 60s-TTL als de andere admin-lijstpagina's (bv. beheer-leden-page-data)
// — de cijfers zijn voor elk bestuurslid identiek, dus delen tussen viewers
// is veilig (zie cachedQuery's eigen uitleg in queryCache.ts).
const TTL_MS = 60_000;

export type StatsPeriod = "7d" | "30d" | "3m" | "12m" | "all";

const PERIOD_DAYS: Record<Exclude<StatsPeriod, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "3m": 90,
  "12m": 365,
};

export function periodStart(period: StatsPeriod): string | null {
  if (period === "all") return null;
  return new Date(Date.now() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000).toISOString();
}

function countUniqueProfiles(rows: { profile_id: string | null }[]): number {
  return new Set(rows.map((r) => r.profile_id).filter((id): id is string => id !== null)).size;
}

// ---------------------------------------------------------------------------
// Maandelijkse bucketing — gedeeld door alle trendgrafieken. Puur in JS op al
// opgehaalde rijen (geen aparte group-by-queries nodig).
// ---------------------------------------------------------------------------

export type MonthlyPoint = { month: string; label: string; value: number };

function monthKey(iso: string): string {
  return iso.slice(0, 7); // "YYYY-MM"
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("nl-NL", { month: "short", year: "2-digit" });
}

function monthKeysBetween(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= last) {
    keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

function countsByMonth(dates: string[], months: string[]): number[] {
  const counts = new Map(months.map((m) => [m, 0]));
  for (const d of dates) {
    const key = monthKey(d);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return months.map((m) => counts.get(m) ?? 0);
}

function uniqueCountsByMonth(rows: { created_at: string; profile_id: string | null }[], months: string[]): number[] {
  const sets = new Map(months.map((m) => [m, new Set<string>()]));
  for (const r of rows) {
    if (!r.profile_id) continue;
    const set = sets.get(monthKey(r.created_at));
    set?.add(r.profile_id);
  }
  return months.map((m) => sets.get(m)?.size ?? 0);
}

// push_subscriptions_self_select (0001_init.sql) is eigenaar-only — een
// bestuurslid ziet via .from("push_subscriptions") dus alleen zijn eigen
// abonnement(en), nooit de hele tabel. list_push_subscriptions (0041_
// manual_push_broadcast.sql) is de security-definer RPC die dat al oplost
// voor het handmatige pushbericht; hier hergebruikt (en gecachet, want
// zowel Overzicht als het Push-tabblad 'm nodig heeft) voor de tellingen.
async function getAllPushSubscriptions(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ profile_id: string; created_at: string }[]> {
  return cachedQuery("statistieken-push-subscriptions", TTL_MS, async () => {
    const { data } = await supabase.rpc("list_push_subscriptions");
    return data ?? [];
  });
}

// ---------------------------------------------------------------------------
// Overzicht
// ---------------------------------------------------------------------------

export type OverviewStats = {
  totalMembers: number;
  activeMembers: number;
  activePushSubscriptions: number;
  pushPercentage: number;
  newMembers: number;
  newCompanies: number;
  upcomingActivities: number;
  memberGrowth: MonthlyPoint[];
  newMembersPerMonth: MonthlyPoint[];
};

export async function getOverviewStats(period: StatsPeriod): Promise<OverviewStats> {
  return cachedQuery(`statistieken-overzicht-${period}`, TTL_MS, async () => {
    const supabase = await createClient();
    const since = periodStart(period);

    const [
      { count: totalMembers },
      { count: activeMembers },
      { count: newMembers },
      { count: newCompanies },
      { count: upcomingActivities },
      pushSubscriptions,
      { data: allProfileDates },
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
      since
        ? supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since)
        : supabase.from("profiles").select("id", { count: "exact", head: true }),
      since
        ? supabase.from("companies").select("id", { count: "exact", head: true }).gte("created_at", since)
        : supabase.from("companies").select("id", { count: "exact", head: true }),
      supabase
        .from("activities")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved")
        .gte("starts_at", new Date().toISOString()),
      getAllPushSubscriptions(supabase),
      supabase.from("profiles").select("created_at").order("created_at", { ascending: true }),
    ]);

    const uniquePushMembers = new Set(pushSubscriptions.map((s) => s.profile_id)).size;

    // Groei-curve: altijd de volledige geschiedenis gebruiken om de
    // cumulatieve basis kloppend te houden, en pas daarna inkorten tot de
    // gekozen periode — anders zou "laatste 30 dagen" een curve tonen die
    // bij 0 begint i.p.v. bij het echte ledenaantal van toen.
    const profileDates = (allProfileDates ?? []).map((r) => r.created_at);
    let memberGrowth: MonthlyPoint[] = [];
    let newMembersPerMonth: MonthlyPoint[] = [];
    if (profileDates.length > 0) {
      const allMonths = monthKeysBetween(new Date(profileDates[0]), new Date());
      const newPerMonth = countsByMonth(profileDates, allMonths);
      let running = 0;
      const cumulative = newPerMonth.map((c) => (running += c));
      const sinceMonth = since ? monthKey(since) : allMonths[0];
      const startIdx = Math.max(
        0,
        allMonths.findIndex((m) => m >= sinceMonth)
      );
      memberGrowth = allMonths
        .slice(startIdx)
        .map((m, i) => ({ month: m, label: monthLabel(m), value: cumulative[startIdx + i] }));
      newMembersPerMonth = allMonths
        .slice(startIdx)
        .map((m, i) => ({ month: m, label: monthLabel(m), value: newPerMonth[startIdx + i] }));
    }

    return {
      totalMembers: totalMembers ?? 0,
      activeMembers: activeMembers ?? 0,
      activePushSubscriptions: pushSubscriptions.length,
      pushPercentage: activeMembers ? Math.round((uniquePushMembers / activeMembers) * 100) : 0,
      newMembers: newMembers ?? 0,
      newCompanies: newCompanies ?? 0,
      upcomingActivities: upcomingActivities ?? 0,
      memberGrowth,
      newMembersPerMonth,
    };
  });
}

// ---------------------------------------------------------------------------
// Community
// ---------------------------------------------------------------------------

export type PostBreakdownRow = {
  id: string;
  excerpt: string;
  uniqueViews: number;
  totalViews: number;
  likes: number;
  comments: number;
};

export type CommunityStats = {
  totalPosts: number;
  uniqueViewers: number;
  totalLikes: number;
  totalComments: number;
  posts: PostBreakdownRow[];
  postsAndCommentsPerMonth: { month: string; label: string; posts: number; comments: number }[];
  viewsPerMonth: MonthlyPoint[];
};

export async function getCommunityStats(period: StatsPeriod): Promise<CommunityStats> {
  return cachedQuery(`statistieken-community-${period}`, TTL_MS, async () => {
    const supabase = await createClient();
    const since = periodStart(period);

    const [
      { data: allPosts },
      { data: allLikes },
      { data: allCommentLikes },
      { data: allComments },
      { data: allViewEvents },
    ] = await Promise.all([
      supabase.from("feed_posts").select("id, content, created_at").order("created_at", { ascending: false }),
      supabase.from("feed_likes").select("post_id"),
      supabase.from("feed_comment_likes").select("id", { count: "exact", head: true }),
      supabase.from("feed_comments").select("post_id, created_at"),
      supabase.from("events").select("profile_id, target_id, created_at").eq("event_type", "post_viewed"),
    ]);

    const posts = allPosts ?? [];
    const likes = allLikes ?? [];
    const comments = allComments ?? [];
    const viewEvents = allViewEvents ?? [];

    // Per-bericht: totale views (elk event telt), unieke views (aparte
    // leden), likes en reacties — alle-tijd, want dit is een volledige
    // roster van berichten, geen periodegebonden trend.
    const totalViewsByPost = new Map<string, number>();
    const uniqueViewersByPost = new Map<string, Set<string>>();
    for (const e of viewEvents) {
      if (!e.target_id) continue;
      totalViewsByPost.set(e.target_id, (totalViewsByPost.get(e.target_id) ?? 0) + 1);
      if (e.profile_id) {
        const set = uniqueViewersByPost.get(e.target_id) ?? new Set<string>();
        set.add(e.profile_id);
        uniqueViewersByPost.set(e.target_id, set);
      }
    }
    const likesByPost = new Map<string, number>();
    for (const l of likes) likesByPost.set(l.post_id, (likesByPost.get(l.post_id) ?? 0) + 1);
    const commentsByPost = new Map<string, number>();
    for (const c of comments) commentsByPost.set(c.post_id, (commentsByPost.get(c.post_id) ?? 0) + 1);

    const postRows: PostBreakdownRow[] = posts.map((p) => ({
      id: p.id,
      excerpt: p.content?.slice(0, 80) || "(bericht zonder tekst)",
      uniqueViews: uniqueViewersByPost.get(p.id)?.size ?? 0,
      totalViews: totalViewsByPost.get(p.id) ?? 0,
      likes: likesByPost.get(p.id) ?? 0,
      comments: commentsByPost.get(p.id) ?? 0,
    }));

    // Trendgrafieken respecteren wél de periodefilter.
    const postDatesInPeriod = posts.map((p) => p.created_at).filter((d) => !since || d >= since);
    const commentDatesInPeriod = comments.map((c) => c.created_at).filter((d) => !since || d >= since);
    const viewsInPeriod = viewEvents.filter((e) => !since || e.created_at >= since);

    const combinedDates = [...postDatesInPeriod, ...commentDatesInPeriod];
    let postsAndCommentsPerMonth: CommunityStats["postsAndCommentsPerMonth"] = [];
    if (combinedDates.length > 0) {
      const months = monthKeysBetween(new Date([...combinedDates].sort()[0]), new Date());
      const postCounts = countsByMonth(postDatesInPeriod, months);
      const commentCounts = countsByMonth(commentDatesInPeriod, months);
      postsAndCommentsPerMonth = months.map((m, i) => ({
        month: m,
        label: monthLabel(m),
        posts: postCounts[i],
        comments: commentCounts[i],
      }));
    }

    let viewsPerMonth: MonthlyPoint[] = [];
    if (viewsInPeriod.length > 0) {
      const dates = viewsInPeriod.map((e) => e.created_at);
      const months = monthKeysBetween(new Date([...dates].sort()[0]), new Date());
      const counts = uniqueCountsByMonth(viewsInPeriod, months);
      viewsPerMonth = months.map((m, i) => ({ month: m, label: monthLabel(m), value: counts[i] }));
    }

    return {
      totalPosts: posts.length,
      uniqueViewers: countUniqueProfiles(viewEvents),
      totalLikes: likes.length + (allCommentLikes?.length ?? 0),
      totalComments: comments.length,
      posts: postRows,
      postsAndCommentsPerMonth,
      viewsPerMonth,
    };
  });
}

// ---------------------------------------------------------------------------
// Activiteiten
// ---------------------------------------------------------------------------

export type ActivityBreakdownRow = {
  id: string;
  title: string;
  uniqueViews: number;
  registrations: number;
  attendees: number;
};

export type ActivityStats = {
  totalActivities: number;
  uniqueViewers: number;
  totalRegistrations: number;
  totalAttendees: number;
  viewToRegistrationPercentage: number | null;
  activities: ActivityBreakdownRow[];
  registrationsAndAttendancePerMonth: { month: string; label: string; registrations: number; attendees: number }[];
};

export async function getActivityStats(period: StatsPeriod): Promise<ActivityStats> {
  return cachedQuery(`statistieken-activiteiten-${period}`, TTL_MS, async () => {
    const supabase = await createClient();
    const since = periodStart(period);

    const [{ data: allActivities }, { data: allRegistrations }, { data: allViewEvents }] = await Promise.all([
      supabase
        .from("activities")
        .select("id, title, starts_at")
        .eq("status", "approved")
        .order("starts_at", { ascending: false }),
      supabase.from("activity_registrations").select("activity_id, attended"),
      supabase.from("events").select("profile_id, target_id").eq("event_type", "activity_viewed"),
    ]);

    const activities = allActivities ?? [];
    const registrations = allRegistrations ?? [];
    const viewEvents = allViewEvents ?? [];

    const uniqueViewersByActivity = new Map<string, Set<string>>();
    for (const e of viewEvents) {
      if (!e.target_id || !e.profile_id) continue;
      const set = uniqueViewersByActivity.get(e.target_id) ?? new Set<string>();
      set.add(e.profile_id);
      uniqueViewersByActivity.set(e.target_id, set);
    }
    const registrationsByActivity = new Map<string, { attended: boolean }[]>();
    for (const r of registrations) {
      const list = registrationsByActivity.get(r.activity_id) ?? [];
      list.push({ attended: r.attended });
      registrationsByActivity.set(r.activity_id, list);
    }

    const activityRows: ActivityBreakdownRow[] = activities.map((a) => {
      const regs = registrationsByActivity.get(a.id) ?? [];
      return {
        id: a.id,
        title: a.title,
        uniqueViews: uniqueViewersByActivity.get(a.id)?.size ?? 0,
        registrations: regs.length,
        attendees: regs.filter((r) => r.attended).length,
      };
    });

    // Trend: aanmeldingen/aanwezigheid toegeschreven aan de maand waarin de
    // activiteit zelf plaatsvond (starts_at), niet het aanmeldmoment — dat
    // vertelt beter wanneer de club daadwerkelijk actief was.
    const startsAtByActivity = new Map(activities.map((a) => [a.id, a.starts_at]));
    const regEntries = registrations
      .map((r) => ({ startsAt: startsAtByActivity.get(r.activity_id), attended: r.attended }))
      .filter((r): r is { startsAt: string; attended: boolean } => Boolean(r.startsAt) && (!since || r.startsAt! >= since));

    let registrationsAndAttendancePerMonth: ActivityStats["registrationsAndAttendancePerMonth"] = [];
    if (regEntries.length > 0) {
      const dates = regEntries.map((r) => r.startsAt);
      const months = monthKeysBetween(new Date([...dates].sort()[0]), new Date());
      const regCounts = countsByMonth(dates, months);
      const attendedDates = regEntries.filter((r) => r.attended).map((r) => r.startsAt);
      const attendCounts = countsByMonth(attendedDates, months);
      registrationsAndAttendancePerMonth = months.map((m, i) => ({
        month: m,
        label: monthLabel(m),
        registrations: regCounts[i],
        attendees: attendCounts[i],
      }));
    }

    const uniqueViewers = countUniqueProfiles(viewEvents);
    return {
      totalActivities: activities.length,
      uniqueViewers,
      totalRegistrations: registrations.length,
      totalAttendees: registrations.filter((r) => r.attended).length,
      viewToRegistrationPercentage: uniqueViewers > 0 ? Math.round((registrations.length / uniqueViewers) * 100) : null,
      activities: activityRows,
      registrationsAndAttendancePerMonth,
    };
  });
}

// ---------------------------------------------------------------------------
// Push & e-mail
// ---------------------------------------------------------------------------

export type PushStats = {
  activePushSubscriptions: number;
  pushPercentage: number;
  newPushSubscriptions: number;
  unsubscribedPushSubscriptions: number;
  pushesSent: number;
  pushesOpened: number;
  openRatePerMonth: MonthlyPoint[];
};

export async function getPushStats(period: StatsPeriod): Promise<PushStats> {
  return cachedQuery(`statistieken-push-${period}`, TTL_MS, async () => {
    const supabase = await createClient();
    const since = periodStart(period);

    const [
      { count: activeMembers },
      pushSubscriptions,
      { count: unsubscribedPushSubscriptions },
      { data: sentNotifications },
      { data: openEvents },
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
      getAllPushSubscriptions(supabase),
      since
        ? supabase
            .from("events")
            .select("id", { count: "exact", head: true })
            .eq("event_type", "push_unsubscribed")
            .gte("created_at", since)
        : supabase.from("events").select("id", { count: "exact", head: true }).eq("event_type", "push_unsubscribed"),
      (since
        ? supabase.from("notifications").select("id, created_at").not("pushed_at", "is", null).gte("created_at", since)
        : supabase.from("notifications").select("id, created_at").not("pushed_at", "is", null)
      ).order("created_at", { ascending: true }),
      supabase.from("events").select("target_id").eq("event_type", "notification_opened").contains("metadata", { channel: "push" }),
    ]);

    const uniquePushMembers = new Set(pushSubscriptions.map((s) => s.profile_id)).size;
    const newPushSubscriptions = since ? pushSubscriptions.filter((s) => s.created_at >= since).length : pushSubscriptions.length;

    const openedIds = new Set((openEvents ?? []).map((e) => e.target_id).filter((id): id is string => Boolean(id)));
    const sent = sentNotifications ?? [];
    const openedCount = sent.filter((n) => openedIds.has(n.id)).length;

    let openRatePerMonth: MonthlyPoint[] = [];
    if (sent.length > 0) {
      const dates = sent.map((n) => n.created_at);
      const months = monthKeysBetween(new Date(dates[0]), new Date());
      const sentCounts = countsByMonth(dates, months);
      const openedDates = sent.filter((n) => openedIds.has(n.id)).map((n) => n.created_at);
      const openedCounts = countsByMonth(openedDates, months);
      openRatePerMonth = months
        .map((m, i) => ({
          month: m,
          label: monthLabel(m),
          value: sentCounts[i] > 0 ? Math.round((openedCounts[i] / sentCounts[i]) * 1000) / 10 : null,
        }))
        .filter((p): p is MonthlyPoint => p.value !== null);
    }

    return {
      activePushSubscriptions: pushSubscriptions.length,
      pushPercentage: activeMembers ? Math.round((uniquePushMembers / activeMembers) * 100) : 0,
      newPushSubscriptions,
      unsubscribedPushSubscriptions: unsubscribedPushSubscriptions ?? 0,
      pushesSent: sent.length,
      pushesOpened: openedCount,
      openRatePerMonth,
    };
  });
}

export type EmailStats = {
  emailsSent: number;
  emailsOpened: number;
  openRatePercentage: number | null;
  openRatePerMonth: MonthlyPoint[];
};

// Geen "actieve abonnementen" zoals bij push — e-mail gaat naar het
// profiel-e-mailadres van elk lid, dat is geen aparte opt-in-registratie.
export async function getEmailStats(period: StatsPeriod): Promise<EmailStats> {
  return cachedQuery(`statistieken-email-${period}`, TTL_MS, async () => {
    const supabase = await createClient();
    const since = periodStart(period);

    const [{ data: sentNotifications }, { data: openEvents }] = await Promise.all([
      (since
        ? supabase.from("notifications").select("id, created_at").not("emailed_at", "is", null).gte("created_at", since)
        : supabase.from("notifications").select("id, created_at").not("emailed_at", "is", null)
      ).order("created_at", { ascending: true }),
      supabase.from("events").select("target_id").eq("event_type", "notification_opened").contains("metadata", { channel: "email" }),
    ]);

    const openedIds = new Set((openEvents ?? []).map((e) => e.target_id).filter((id): id is string => Boolean(id)));
    const sent = sentNotifications ?? [];
    const openedCount = sent.filter((n) => openedIds.has(n.id)).length;

    let openRatePerMonth: MonthlyPoint[] = [];
    if (sent.length > 0) {
      const dates = sent.map((n) => n.created_at);
      const months = monthKeysBetween(new Date(dates[0]), new Date());
      const sentCounts = countsByMonth(dates, months);
      const openedDates = sent.filter((n) => openedIds.has(n.id)).map((n) => n.created_at);
      const openedCounts = countsByMonth(openedDates, months);
      openRatePerMonth = months
        .map((m, i) => ({
          month: m,
          label: monthLabel(m),
          value: sentCounts[i] > 0 ? Math.round((openedCounts[i] / sentCounts[i]) * 1000) / 10 : null,
        }))
        .filter((p): p is MonthlyPoint => p.value !== null);
    }

    return {
      emailsSent: sent.length,
      emailsOpened: openedCount,
      openRatePercentage: sent.length ? Math.round((openedCount / sent.length) * 100) : null,
      openRatePerMonth,
    };
  });
}

// ---------------------------------------------------------------------------
// Per-melding-overzicht (gedeeld door de E-mail- en Push-tabbladen)
// ---------------------------------------------------------------------------

export type NotificationBreakdownRow = {
  key: string;
  title: string;
  type: string;
  sentPush: number;
  openedPush: number;
  sentEmail: number;
  openedEmail: number;
  firstSentAt: string;
};

// "Geopende e-mails: 100" zegt niks over welke e-mail dat was — dit
// groepeert de individuele notificatie-rijen (één per ontvanger) per
// titel+type, zodat per verzending (bv. een specifieke activiteit, of een
// handmatig pushbericht) te zien is hoeveel er zijn verstuurd/geopend, wélk
// percentage dat is en wanneer het verstuurd is. Alle-tijd (geen
// periodefilter): dit is een volledige roster van verzonden meldingen,
// zelfde soort "volledige lijst" als Activiteiten en Community-berichten.
export async function getNotificationBreakdown(): Promise<NotificationBreakdownRow[]> {
  return cachedQuery("statistieken-notificaties-breakdown", TTL_MS, async () => {
    const supabase = await createClient();

    const [{ data: notifications }, { data: openEvents }] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, type, title, pushed_at, emailed_at, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("events").select("target_id, metadata").eq("event_type", "notification_opened"),
    ]);

    const openedPushIds = new Set<string>();
    const openedEmailIds = new Set<string>();
    for (const e of openEvents ?? []) {
      if (!e.target_id) continue;
      const channel = (e.metadata as { channel?: string } | null)?.channel;
      if (channel === "push") openedPushIds.add(e.target_id);
      if (channel === "email") openedEmailIds.add(e.target_id);
    }

    const byKey = new Map<string, NotificationBreakdownRow>();
    for (const n of notifications ?? []) {
      const key = `${n.type}::${n.title}`;
      const row =
        byKey.get(key) ??
        ({
          key,
          title: n.title,
          type: n.type,
          sentPush: 0,
          openedPush: 0,
          sentEmail: 0,
          openedEmail: 0,
          firstSentAt: n.created_at,
        } satisfies NotificationBreakdownRow);
      if (n.created_at < row.firstSentAt) row.firstSentAt = n.created_at;
      if (n.pushed_at) {
        row.sentPush += 1;
        if (openedPushIds.has(n.id)) row.openedPush += 1;
      }
      if (n.emailed_at) {
        row.sentEmail += 1;
        if (openedEmailIds.has(n.id)) row.openedEmail += 1;
      }
      byKey.set(key, row);
    }

    return [...byKey.values()].sort((a, b) => (a.firstSentAt < b.firstSentAt ? 1 : -1));
  });
}
