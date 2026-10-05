"use client";

import Link from "next/link";
import { DeleteButton } from "@/components/feed/DeleteButton";
import { deleteCommunicationAction } from "@/app/(app)/beheer/communicatie/actions";
import type { Database } from "@/lib/types/database";

type Communication = Database["public"]["Tables"]["communications"]["Row"] & {
  activity?: { title: string } | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    concept: "bg-black/[.06] text-muted dark:bg-white/[.08]",
    verzonden: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
    verzenden_mislukt: "bg-voc-red-light text-voc-red",
  };
  const labels: Record<string, string> = {
    concept: "Concept",
    verzonden: "Verzonden",
    verzenden_mislukt: "Verzending onderbroken",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.concept}`}>
      {labels[status] ?? status}
    </span>
  );
}

export function CommunicationRow({ communication }: { communication: Communication }) {
  const canDelete = communication.status !== "verzonden";

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm">
      <div className="min-w-0 flex-1">
        <Link href={`/beheer/communicatie/${communication.id}`} className="truncate text-sm font-medium text-foreground hover:underline">
          {communication.subject}
        </Link>
        {communication.preheader && <p className="truncate text-xs text-muted">{communication.preheader}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <StatusBadge status={communication.status} />
          {communication.activity && (
            <span className="rounded-full bg-black/[.06] px-2 py-0.5 text-xs text-muted dark:bg-white/[.08]">
              {communication.activity.title}
            </span>
          )}
          <span className="text-xs text-muted">{formatDate(communication.sent_at ?? communication.created_at)}</span>
          {typeof communication.total_recipients === "number" && (
            <span className="text-xs text-muted">{communication.total_recipients} ontvangers</span>
          )}
        </div>
      </div>
      {canDelete && (
        <DeleteButton
          confirmMessage={`Weet je zeker dat je "${communication.subject}" wilt verwijderen?`}
          onDelete={deleteCommunicationAction.bind(null, communication.id)}
        />
      )}
    </div>
  );
}
