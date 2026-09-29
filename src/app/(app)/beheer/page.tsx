import type { Metadata } from "next";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Beheer" };

// Iemand telt als "online" zolang OnlineHeartbeat zijn tabblad recent nog
// heeft geping (elke 2 min bij een zichtbaar tabblad) — 5 min marge dekt
// een gemiste heartbeat door een korte netwerkhik of tabwissel.
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export default async function BeheerPage() {
  await requireBoard();
  const supabase = await createClient();

  const [
    { count: memberCount },
    { count: companyCount },
    { count: pendingInvitations },
    { count: pendingRequests },
    { count: upcomingActivities },
    { count: pendingActivities },
    { count: openReports },
    { count: onlineCount },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("invitations").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("access_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .gte("starts_at", new Date().toISOString()),
    supabase.from("activities").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("feed_post_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .gte("last_active_at", new Date(new Date().getTime() - ONLINE_WINDOW_MS).toISOString()),
  ]);

  const stats = [
    { label: "Actieve leden", value: memberCount ?? 0 },
    { label: "Aantal bedrijven", value: companyCount ?? 0 },
    { label: "Leden nu online", value: onlineCount ?? 0 },
    { label: "Openstaande uitnodigingen", value: pendingInvitations ?? 0 },
    { label: "Openstaande aanvragen", value: pendingRequests ?? 0 },
    { label: "Aankomende activiteiten", value: upcomingActivities ?? 0 },
    { label: "Activiteiten ter goedkeuring", value: pendingActivities ?? 0 },
    { label: "Openstaande rapportages", value: openReports ?? 0 },
  ];

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-foreground">Beheer</h1>
      <p className="mb-6 text-sm text-muted">Overzicht voor bestuur en beheer.</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
