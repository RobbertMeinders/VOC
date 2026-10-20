import "server-only";

import { createClient } from "@/lib/supabase/server";
import { cachedQuery } from "@/lib/cache/queryCache";
import { POST_TYPE_LABELS } from "@/lib/feed/postType";
import type { FeedPostType } from "@/lib/feed/types";
import type { PeriodRange, TrendPoint } from "./period";
import { bucketsFor, bucketCountSeries, type Kpi } from "./shared";

const TTL_MS = 60_000;

type TopPostRow = {
  id: string;
  content: string | null;
  author: { first_name: string; last_name: string } | null;
};

export type CommunityStats = {
  kpis: {
    berichten: Kpi;
    reacties: Kpi;
    ledenDieMeedoen: Kpi;
    reactiesPerBericht: Kpi;
  };
  trend: TrendPoint[]; // reacties
  trendBerichten: TrendPoint[];
  perSoort: { label: string; value: number }[];
  meestGelezen: { title: string; author: string; views: number; comments: number }[];
};

export async function getCommunityStats(range: PeriodRange): Promise<CommunityStats> {
  const supabase = await createClient();
  return cachedQuery(`statistieken-community-${range.period}`, TTL_MS, async () => {
    const buckets = bucketsFor(range);

    const [
      { data: posts },
      { data: postsPrev },
      { data: comments },
      { data: commentsPrev },
      { count: activeMemberCount },
      { data: allPostsForTop },
      { data: viewEvents },
    ] = await Promise.all([
      supabase
        .from("feed_posts")
        .select("id, author_id, type, created_at")
        .gte("created_at", range.start.toISOString())
        .lt("created_at", range.end.toISOString()),
      supabase
        .from("feed_posts")
        .select("id, author_id")
        .gte("created_at", range.prevStart.toISOString())
        .lt("created_at", range.prevEnd.toISOString()),
      supabase
        .from("feed_comments")
        .select("id, author_id, created_at")
        .gte("created_at", range.start.toISOString())
        .lt("created_at", range.end.toISOString()),
      supabase
        .from("feed_comments")
        .select("id, author_id")
        .gte("created_at", range.prevStart.toISOString())
        .lt("created_at", range.prevEnd.toISOString()),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase
        .from("feed_posts")
        .select("id, content, author:profiles!feed_posts_author_id_fkey(first_name, last_name)")
        .order("created_at", { ascending: false })
        .limit(200)
        .returns<TopPostRow[]>(),
      supabase.from("events").select("target_id").eq("event_type", "post_viewed"),
    ]);

    const postRows = posts ?? [];
    const commentRows = comments ?? [];

    const trendBerichten = bucketCountSeries(
      postRows.map((p) => p.created_at),
      buckets
    );
    const trend = bucketCountSeries(
      commentRows.map((c) => c.created_at),
      buckets
    );

    const participants = new Set<string>([...postRows.map((p) => p.author_id), ...commentRows.map((c) => c.author_id)]);
    const ledenDieMeedoenPct = activeMemberCount ? Math.round((participants.size / activeMemberCount) * 100) : 0;

    const typeCounts = new Map<FeedPostType, number>();
    for (const p of postRows) {
      const type = (p.type ?? "overig") as FeedPostType;
      typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
    }
    const perSoort = [...typeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([type, value]) => ({ label: POST_TYPE_LABELS[type] ?? type, value }));

    // Meest gelezen: all-time (geen periodefilter — een goed bericht van drie
    // maanden terug mag gewoon blijven staan), top 2 op unieke views.
    const viewsByPost = new Map<string, number>();
    for (const e of viewEvents ?? []) {
      if (!e.target_id) continue;
      viewsByPost.set(e.target_id, (viewsByPost.get(e.target_id) ?? 0) + 1);
    }
    const commentCountByPost = new Map<string, number>();
    const { data: allComments } = await supabase.from("feed_comments").select("post_id");
    for (const c of allComments ?? []) {
      commentCountByPost.set(c.post_id, (commentCountByPost.get(c.post_id) ?? 0) + 1);
    }
    const meestGelezen = (allPostsForTop ?? [])
      .map((p) => ({
        title: p.content?.slice(0, 60) || "(bericht zonder tekst)",
        author: p.author ? `${p.author.first_name} ${p.author.last_name}` : "Onbekend lid",
        views: viewsByPost.get(p.id) ?? 0,
        comments: commentCountByPost.get(p.id) ?? 0,
      }))
      .filter((p) => p.views > 0)
      .sort((a, b) => b.views - a.views)
      .slice(0, 2);

    return {
      kpis: {
        berichten: { label: "Berichten", value: postRows.length, previousValue: postsPrev?.length ?? 0 },
        reacties: { label: "Reacties", value: commentRows.length, previousValue: commentsPrev?.length ?? 0 },
        ledenDieMeedoen: { label: "Leden die meedoen", value: ledenDieMeedoenPct, unit: "%", previousValue: null },
        reactiesPerBericht: {
          label: "Reacties per bericht",
          value: postRows.length > 0 ? Math.round((commentRows.length / postRows.length) * 10) / 10 : 0,
          previousValue: null,
        },
      },
      trend,
      trendBerichten,
      perSoort,
      meestGelezen,
    };
  });
}
