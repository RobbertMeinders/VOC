import "server-only";

import { createClient } from "@/lib/supabase/server";
import { cachedQuery } from "@/lib/cache/queryCache";

// Zelfde 60s-TTL als de andere admin-lijstpagina's (bv. beheer-leden-page-data)
// — de cijfers zijn voor elk bestuurslid identiek, dus delen tussen viewers
// is veilig (zie cachedQuery's eigen uitleg in queryCache.ts).
const TTL_MS = 60_000;
const WINDOW_DAYS = 30;

function windowStart(): string {
  return new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function countUniqueProfiles(rows: { profile_id: string | null }[]): number {
  return new Set(rows.map((r) => r.profile_id).filter((id): id is string => id !== null)).size;
}

// push_subscriptions_self_select (0001_init.sql) is eigenaar-only — een
// bestuurslid ziet via .from("push_subscriptions") dus alleen zijn eigen
// abonnement(en), nooit de hele tabel. list_push_subscriptions (0041_
// manual_push_broadcast.sql) is de security-definer RPC die dat al oplost
// voor het handmatige pushbericht; hier hergebruikt (en gecachet, want
// zowel Overzicht als Notificaties heeft 'm nodig) voor de tellingen.
async function getAllPushSubscriptions(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ profile_id: string; created_at: string }[]> {
  return cachedQuery("statistieken-push-subscriptions", TTL_MS, async () => {
    const { data } = await supabase.rpc("list_push_subscriptions");
    return data ?? [];
  });
}

// Groepeert view-events per target_id (aantal + unieke kijkers) en geeft de
// top N terug — gebruikt door zowel Community als Activiteiten voor "meest
// bekeken".
function topViewedTargets(
  events: { profile_id: string | null; target_id: string | null }[],
  limit: number
): { id: string; views: number }[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    if (!e.target_id) continue;
    counts.set(e.target_id, (counts.get(e.target_id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, views]) => ({ id, views }));
}

export type OverviewStats = {
  totalMembers: number;
  activeMembers: number;
  activePushSubscriptions: number;
  pushPercentage: number;
  newMembers: number;
  newCompanies: number;
  upcomingActivities: number;
};

export async function getOverviewStats(): Promise<OverviewStats> {
  return cachedQuery("statistieken-overzicht", TTL_MS, async () => {
    const supabase = await createClient();
    const since = windowStart();

    const [
      { count: totalMembers },
      { count: activeMembers },
      { count: newMembers },
      { count: newCompanies },
      { count: upcomingActivities },
      pushProfileIds,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabase.from("companies").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabase
        .from("activities")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved")
        .gte("starts_at", new Date().toISOString()),
      getAllPushSubscriptions(supabase),
    ]);

    const uniquePushMembers = new Set(pushProfileIds.map((s) => s.profile_id)).size;

    return {
      totalMembers: totalMembers ?? 0,
      activeMembers: activeMembers ?? 0,
      activePushSubscriptions: pushProfileIds.length,
      pushPercentage: activeMembers ? Math.round((uniquePushMembers / activeMembers) * 100) : 0,
      newMembers: newMembers ?? 0,
      newCompanies: newCompanies ?? 0,
      upcomingActivities: upcomingActivities ?? 0,
    };
  });
}

export type CommunityStats = {
  totalPosts: number;
  uniqueViewers: number;
  totalLikes: number;
  totalComments: number;
  topPosts: { id: string; excerpt: string; views: number }[];
};

export async function getCommunityStats(): Promise<CommunityStats> {
  return cachedQuery("statistieken-community", TTL_MS, async () => {
    const supabase = await createClient();

    const [
      { count: totalPosts },
      { count: postLikes },
      { count: commentLikes },
      { count: totalComments },
      { data: viewEvents },
    ] = await Promise.all([
      supabase.from("feed_posts").select("id", { count: "exact", head: true }),
      supabase.from("feed_likes").select("id", { count: "exact", head: true }),
      supabase.from("feed_comment_likes").select("id", { count: "exact", head: true }),
      supabase.from("feed_comments").select("id", { count: "exact", head: true }),
      supabase.from("events").select("profile_id, target_id").eq("event_type", "post_viewed"),
    ]);

    const top = topViewedTargets(viewEvents ?? [], 5);
    const { data: topPostRows } =
      top.length > 0
        ? await supabase.from("feed_posts").select("id, content").in("id", top.map((t) => t.id))
        : { data: [] };

    const topPosts = top.map(({ id, views }) => {
      const row = (topPostRows ?? []).find((p) => p.id === id);
      const excerpt = row?.content?.slice(0, 80) ?? "(verwijderd bericht)";
      return { id, excerpt, views };
    });

    return {
      totalPosts: totalPosts ?? 0,
      uniqueViewers: countUniqueProfiles(viewEvents ?? []),
      totalLikes: (postLikes ?? 0) + (commentLikes ?? 0),
      totalComments: totalComments ?? 0,
      topPosts,
    };
  });
}

export type ActivityStats = {
  totalActivities: number;
  uniqueViewers: number;
  totalRegistrations: number;
  totalAttendees: number;
  viewToRegistrationPercentage: number | null;
  topActivities: { id: string; title: string; views: number; registrations: number; attendees: number }[];
};

export async function getActivityStats(): Promise<ActivityStats> {
  return cachedQuery("statistieken-activiteiten", TTL_MS, async () => {
    const supabase = await createClient();

    const [
      { count: totalActivities },
      { count: totalRegistrations },
      { count: totalAttendees },
      { data: viewEvents },
    ] = await Promise.all([
      supabase.from("activities").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("activity_registrations").select("id", { count: "exact", head: true }),
      supabase.from("activity_registrations").select("id", { count: "exact", head: true }).eq("attended", true),
      supabase.from("events").select("profile_id, target_id").eq("event_type", "activity_viewed"),
    ]);

    const uniqueViewers = countUniqueProfiles(viewEvents ?? []);
    const top = topViewedTargets(viewEvents ?? [], 5);
    const topIds = top.map((t) => t.id);
    const [{ data: topActivityRows }, { data: topRegistrationRows }] =
      topIds.length > 0
        ? await Promise.all([
            supabase.from("activities").select("id, title").in("id", topIds),
            supabase.from("activity_registrations").select("activity_id, attended").in("activity_id", topIds),
          ])
        : [{ data: [] }, { data: [] }];

    const topActivities = top.map(({ id, views }) => {
      const row = (topActivityRows ?? []).find((a) => a.id === id);
      const registrationRows = (topRegistrationRows ?? []).filter((r) => r.activity_id === id);
      return {
        id,
        title: row?.title ?? "(verwijderde activiteit)",
        views,
        registrations: registrationRows.length,
        attendees: registrationRows.filter((r) => r.attended).length,
      };
    });

    return {
      totalActivities: totalActivities ?? 0,
      uniqueViewers,
      totalRegistrations: totalRegistrations ?? 0,
      totalAttendees: totalAttendees ?? 0,
      viewToRegistrationPercentage: uniqueViewers > 0 ? Math.round(((totalRegistrations ?? 0) / uniqueViewers) * 100) : null,
      topActivities,
    };
  });
}

export type NotificationStats = {
  activePushSubscriptions: number;
  pushPercentage: number;
  newPushSubscriptions: number;
  unsubscribedPushSubscriptions: number;
  pushesSent: number;
  pushesOpened: number;
  emailsSent: number;
  emailsOpened: number;
};

export async function getNotificationStats(): Promise<NotificationStats> {
  return cachedQuery("statistieken-notificaties", TTL_MS, async () => {
    const supabase = await createClient();
    const since = windowStart();

    const [
      { count: activeMembers },
      pushSubscriptions,
      { count: unsubscribedPushSubscriptions },
      { count: pushesSent },
      { count: pushesOpened },
      { count: emailsSent },
      { count: emailsOpened },
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
      getAllPushSubscriptions(supabase),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("event_type", "push_unsubscribed").gte("created_at", since),
      supabase.from("notifications").select("id", { count: "exact", head: true }).not("pushed_at", "is", null).gte("created_at", since),
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "notification_opened")
        .contains("metadata", { channel: "push" })
        .gte("created_at", since),
      supabase.from("notifications").select("id", { count: "exact", head: true }).not("emailed_at", "is", null).gte("created_at", since),
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "notification_opened")
        .contains("metadata", { channel: "email" })
        .gte("created_at", since),
    ]);

    const uniquePushMembers = new Set(pushSubscriptions.map((s) => s.profile_id)).size;
    const newPushSubscriptions = pushSubscriptions.filter((s) => s.created_at >= since).length;

    return {
      activePushSubscriptions: pushSubscriptions.length,
      pushPercentage: activeMembers ? Math.round((uniquePushMembers / activeMembers) * 100) : 0,
      newPushSubscriptions,
      unsubscribedPushSubscriptions: unsubscribedPushSubscriptions ?? 0,
      pushesSent: pushesSent ?? 0,
      pushesOpened: pushesOpened ?? 0,
      emailsSent: emailsSent ?? 0,
      emailsOpened: emailsOpened ?? 0,
    };
  });
}

export type NotificationBreakdownRow = {
  key: string;
  title: string;
  type: string;
  sentPush: number;
  openedPush: number;
  sentEmail: number;
  openedEmail: number;
};

// "Geopende e-mails: 100" zegt niks over welke e-mail dat was — dit
// groepeert de individuele notificatie-rijen (één per ontvanger) per
// titel+type, zodat per verzending (bv. een specifieke activiteit, of een
// handmatig pushbericht) te zien is hoeveel er zijn verstuurd/geopend.
export async function getNotificationBreakdown(): Promise<NotificationBreakdownRow[]> {
  return cachedQuery("statistieken-notificaties-breakdown", TTL_MS, async () => {
    const supabase = await createClient();
    const since = windowStart();

    const [{ data: notifications }, { data: openEvents }] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, type, title, pushed_at, emailed_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false }),
      supabase
        .from("events")
        .select("target_id, metadata")
        .eq("event_type", "notification_opened")
        .gte("created_at", since),
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
      const row = byKey.get(key) ?? { key, title: n.title, type: n.type, sentPush: 0, openedPush: 0, sentEmail: 0, openedEmail: 0 };
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

    return [...byKey.values()]
      .sort((a, b) => b.sentPush + b.sentEmail - (a.sentPush + a.sentEmail))
      .slice(0, 20);
  });
}
