import Link from "next/link";
import { Pencil } from "lucide-react";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "@/components/feed/DeleteButton";
import { RejectActivityForm } from "@/components/agenda/RejectActivityForm";
import { ApproveActivityForm } from "@/components/agenda/ApproveActivityForm";
import { formatActivityDate, formatActivityDateShort } from "@/lib/format/date";
import { deleteActivityAction, decideActivitySubmissionAction } from "@/app/(app)/agenda/actions";
import type { Database } from "@/lib/types/database";

type Activity = Database["public"]["Tables"]["activities"]["Row"];

type ActivityWithCreator = Activity & {
  created_by_profile: { first_name: string; last_name: string } | null;
};

type AuditLogRow = {
  action: string;
  target_id: string | null;
  created_at: string;
  actor: { first_name: string; last_name: string } | null;
};

const STATUS_BADGE: Record<Activity["status"], string> = {
  approved: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  rejected: "bg-voc-red-light text-voc-red",
};
const STATUS_LABEL: Record<Activity["status"], string> = {
  approved: "Goedgekeurd",
  pending: "Ter goedkeuring",
  rejected: "Afgewezen",
};

function profileName(p: { first_name: string; last_name: string } | null): string {
  return p ? `${p.first_name} ${p.last_name}` : "Onbekend";
}

// Overzicht van alle activiteiten (elke status) met de statussen en
// beheeracties direct in de lijst — i.p.v. per activiteit eerst naar de
// detailpagina te moeten voor goedkeuren/afwijzen/bewerken/verwijderen.
export async function BeheerAgendaContent() {
  await requireBoard();
  const supabase = await createClient();

  const { data: activities } = await supabase
    .from("activities")
    .select("*, created_by_profile:profiles!activities_created_by_fkey(first_name, last_name)")
    .order("starts_at", { ascending: false })
    .returns<ActivityWithCreator[]>();

  const activityIds = (activities ?? []).map((a) => a.id);

  // Wie heeft goedgekeurd/afgewezen/laatst gewijzigd staat niet op de
  // activiteit zelf (alleen created_by) — dat komt uit audit_logs
  // (0059_audit_logs.sql), gelogd vanuit decideActivitySubmissionAction/
  // updateActivityAction. Eén query voor alle activiteiten i.p.v. per rij,
  // aflopend gesorteerd zodat de eerste match per activiteit+actie de
  // meest recente is.
  const { data: logs } =
    activityIds.length > 0
      ? await supabase
          .from("audit_logs")
          .select("action, target_id, created_at, actor:profiles(first_name, last_name)")
          .eq("target_type", "activity")
          .in("target_id", activityIds)
          .order("created_at", { ascending: false })
          .returns<AuditLogRow[]>()
      : { data: [] as AuditLogRow[] };

  function latestLog(activityId: string, actions: string[]) {
    return (logs ?? []).find((l) => l.target_id === activityId && actions.includes(l.action)) ?? null;
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-foreground">Agenda beheren</h1>
      <p className="mb-4 text-sm text-muted">Alle activiteiten met status, goedkeuren/afwijzen/bewerken/verwijderen.</p>

      <div className="flex flex-col gap-3">
        {(activities ?? []).map((activity) => {
          const decisionLog = latestLog(activity.id, ["activity_approved", "activity_rejected"]);
          const updateLog = latestLog(activity.id, ["activity_updated"]);
          const creatorName = profileName(activity.created_by_profile);

          return (
          <div key={activity.id} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[activity.status]}`}>
                    {STATUS_LABEL[activity.status]}
                  </span>
                  {activity.source === "lid" && (
                    <span className="rounded-full bg-black/[.06] px-2 py-0.5 text-xs font-medium text-muted dark:bg-white/[.08]">
                      Ingebracht
                    </span>
                  )}
                </div>
                <Link href={`/agenda/${activity.id}`} className="text-sm font-medium text-foreground hover:text-voc-red">
                  {activity.title}
                </Link>
                <p className="text-xs text-muted">{formatActivityDate(activity.starts_at)}</p>

                {/* Contextuele beheerlogging: wie heeft dit aangemaakt/
                    beoordeeld/laatst gewijzigd en wanneer — zie de
                    voorbeeldopmaak in het Deel 2-verzoek ("Aangemaakt door …
                    · Goedgekeurd door …"). */}
                <div className="mt-1.5 flex flex-col gap-0.5 text-xs text-muted">
                  <p>
                    {activity.status === "pending" ? "Aangeleverd door " : "Aangemaakt door "}
                    {creatorName} · {formatActivityDateShort(activity.created_at)}
                  </p>
                  {decisionLog && (
                    <p>
                      {decisionLog.action === "activity_approved" ? "Goedgekeurd door " : "Afgewezen door "}
                      {profileName(decisionLog.actor)} · {formatActivityDateShort(decisionLog.created_at)}
                    </p>
                  )}
                  {updateLog && (
                    <p>
                      Laatst gewijzigd door {profileName(updateLog.actor)} · {formatActivityDateShort(updateLog.created_at)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/agenda/${activity.id}/bewerken`}
                  aria-label="Bewerken"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:border-voc-red hover:text-voc-red"
                >
                  <Pencil size={14} />
                </Link>
                <DeleteButton
                  onDelete={deleteActivityAction.bind(null, activity.id, false)}
                  confirmMessage="Weet je zeker dat je deze activiteit wilt verwijderen? Aanmeldingen worden ook verwijderd."
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-voc-red hover:border-voc-red"
                />
              </div>
            </div>

            {activity.status === "pending" && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <ApproveActivityForm
                  size="xs"
                  onApprove={async (notifyPush, notifyEmail) => {
                    "use server";
                    await decideActivitySubmissionAction(activity.id, "approved", undefined, notifyPush, notifyEmail);
                  }}
                />
                <RejectActivityForm
                  onReject={async (reason) => {
                    "use server";
                    await decideActivitySubmissionAction(activity.id, "rejected", reason);
                  }}
                />
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}
