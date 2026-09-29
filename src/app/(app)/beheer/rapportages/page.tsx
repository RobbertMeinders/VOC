import type { Metadata } from "next";
import { Flag } from "lucide-react";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { BackLink } from "@/components/ui/BackLink";
import { ReportRow, type ReportResolution, type ReportRowData } from "@/components/moderation/ReportRow";

export const metadata: Metadata = { title: "Rapportages" };

const RESOLVED_LIMIT = 20;

type ReportQueryRow = {
  id: string;
  reason: string;
  details: string | null;
  created_at: string;
  reporter: { first_name: string; last_name: string } | null;
  post: { id: string; content: string | null; author: { first_name: string; last_name: string } | null } | null;
};

type AuditLogRow = {
  target_id: string | null;
  created_at: string;
  metadata: { decision?: string } | null;
  actor: { first_name: string; last_name: string } | null;
};

function toReportRowData(r: ReportQueryRow): Omit<ReportRowData, "resolution"> {
  return {
    id: r.id,
    reason: r.reason,
    details: r.details,
    createdAt: r.created_at,
    reporterName: r.reporter ? `${r.reporter.first_name} ${r.reporter.last_name}` : "Een lid",
    post: r.post
      ? {
          id: r.post.id,
          content: r.post.content,
          authorName: r.post.author ? `${r.post.author.first_name} ${r.post.author.last_name}` : "Onbekend",
        }
      : null,
  };
}

export default async function RapportagesPage() {
  await requireBoard();
  const supabase = await createClient();

  const [{ data: openReports }, { data: resolvedReports }] = await Promise.all([
    supabase
      .from("feed_post_reports")
      .select(
        "id, reason, details, created_at, reporter:profiles!feed_post_reports_reporter_id_fkey(first_name, last_name), post:feed_posts(id, content, author:profiles!feed_posts_author_id_fkey(first_name, last_name))"
      )
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .returns<ReportQueryRow[]>(),
    supabase
      .from("feed_post_reports")
      .select(
        "id, reason, details, created_at, reporter:profiles!feed_post_reports_reporter_id_fkey(first_name, last_name), post:feed_posts(id, content, author:profiles!feed_posts_author_id_fkey(first_name, last_name))"
      )
      .eq("status", "afgehandeld")
      .order("created_at", { ascending: false })
      .limit(RESOLVED_LIMIT)
      .returns<ReportQueryRow[]>(),
  ]);

  const openItems: ReportRowData[] = (openReports ?? []).map(toReportRowData);

  const resolvedIds = (resolvedReports ?? []).map((r) => r.id);
  // Wie een rapportage heeft afgehandeld en welke actie is genomen staat niet
  // op de rapportage-rij zelf (alleen status) — dat komt uit audit_logs
  // (report_resolved, zie resolveReportAction).
  const { data: resolutionLogs } =
    resolvedIds.length > 0
      ? await supabase
          .from("audit_logs")
          .select("target_id, created_at, metadata, actor:profiles(first_name, last_name)")
          .eq("action", "report_resolved")
          .eq("target_type", "feed_post_report")
          .in("target_id", resolvedIds)
          .order("created_at", { ascending: false })
          .returns<AuditLogRow[]>()
      : { data: [] as AuditLogRow[] };

  const resolvedItems: ReportRowData[] = (resolvedReports ?? []).map((r) => {
    const log = (resolutionLogs ?? []).find((l) => l.target_id === r.id) ?? null;
    const resolution: ReportResolution | null = log
      ? {
          resolvedByName: log.actor ? `${log.actor.first_name} ${log.actor.last_name}` : "Onbekend",
          resolvedAt: log.created_at,
          action: log.metadata?.decision ?? "Behandeld",
        }
      : null;
    return { ...toReportRowData(r), resolution };
  });

  return (
    <div>
      <BackLink href="/beheer" label="Terug naar Beheer" />
      <h1 className="mb-1 text-xl font-semibold text-foreground">Rapportages</h1>
      <p className="mb-6 text-sm text-muted">Door leden gerapporteerde berichten uit de community-feed.</p>

      <div className="mb-6 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Openstaand</h2>
        {openItems.length > 0 ? (
          openItems.map((report) => <ReportRow key={report.id} report={report} />)
        ) : (
          <ComingSoon icon={Flag} title="Geen openstaande rapportages" description="Gerapporteerde berichten verschijnen hier." />
        )}
      </div>

      {resolvedItems.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Afgehandeld</h2>
          {resolvedItems.map((report) => (
            <ReportRow key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
