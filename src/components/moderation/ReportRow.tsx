"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/format/date";
import { resolveReportAction } from "@/app/(app)/beheer/rapportages/actions";

const REASON_LABELS: Record<string, string> = {
  ongepast: "Ongepast",
  spam: "Spam",
  misleidend: "Misleidend",
  anders: "Anders",
};

export type ReportRowData = {
  id: string;
  reason: string;
  details: string | null;
  createdAt: string;
  reporterName: string;
  post: { id: string; content: string | null; authorName: string } | null;
};

export function ReportRow({ report }: { report: ReportRowData }) {
  const [resolved, setResolved] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (resolved) return null;

  function resolve(decision: "deleted" | "dismissed") {
    if (!report.post) return;
    if (decision === "deleted" && !window.confirm("Dit bericht definitief verwijderen?")) return;
    startTransition(async () => {
      await resolveReportAction(report.id, decision, report.post!.id);
      setResolved(true);
    });
  }

  return (
    <div className="flex flex-col gap-2 border-b border-border py-4 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-voc-red-light px-2 py-0.5 text-xs font-medium text-voc-red">
          {REASON_LABELS[report.reason] ?? report.reason}
        </span>
        <span className="text-xs text-muted">
          Gerapporteerd door {report.reporterName} · {formatRelativeTime(report.createdAt)}
        </span>
      </div>
      {report.details && <p className="text-sm text-foreground">&ldquo;{report.details}&rdquo;</p>}
      {report.post ? (
        <div className="rounded-lg bg-black/[.03] px-3 py-2 dark:bg-white/[.05]">
          <p className="text-xs font-medium text-muted">Bericht van {report.post.authorName}</p>
          <p className="mt-0.5 line-clamp-3 text-sm text-foreground">{report.post.content}</p>
          <Link href={`/community?highlight=${report.post.id}`} className="mt-1 inline-block text-xs text-voc-red hover:underline">
            Bekijk in de feed
          </Link>
        </div>
      ) : (
        <p className="text-sm text-muted">Dit bericht is al verwijderd.</p>
      )}
      <div className="flex items-center gap-2">
        {report.post && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => resolve("deleted")}
            className="rounded-full bg-voc-red px-3 py-1.5 text-xs font-medium text-white hover:bg-voc-red-dark disabled:opacity-60"
          >
            Bericht verwijderen
          </button>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={() => resolve("dismissed")}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
        >
          Melding afwijzen
        </button>
      </div>
    </div>
  );
}
