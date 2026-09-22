import type { Metadata } from "next";
import { Flag } from "lucide-react";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { ReportRow, type ReportRowData } from "@/components/moderation/ReportRow";

export const metadata: Metadata = { title: "Rapportages" };

type ReportQueryRow = {
  id: string;
  reason: string;
  details: string | null;
  created_at: string;
  reporter: { first_name: string; last_name: string } | null;
  post: { id: string; content: string | null; author: { first_name: string; last_name: string } | null } | null;
};

export default async function RapportagesPage() {
  await requireBoard();
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("feed_post_reports")
    .select(
      "id, reason, details, created_at, reporter:profiles!feed_post_reports_reporter_id_fkey(first_name, last_name), post:feed_posts(id, content, author:profiles!feed_posts_author_id_fkey(first_name, last_name))"
    )
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .returns<ReportQueryRow[]>();

  const items: ReportRowData[] = (reports ?? []).map((r) => ({
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
  }));

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-foreground">Rapportages</h1>
      <p className="mb-6 text-sm text-muted">Door leden gerapporteerde berichten uit de community-feed.</p>

      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        {items.length > 0 ? (
          items.map((report) => <ReportRow key={report.id} report={report} />)
        ) : (
          <ComingSoon icon={Flag} title="Geen openstaande rapportages" description="Gerapporteerde berichten verschijnen hier." />
        )}
      </div>
    </div>
  );
}
