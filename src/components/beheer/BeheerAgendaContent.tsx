import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock, Pencil, Plus, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageHeader } from "@/components/ui/PageHeader";
import { DeleteButton } from "@/components/feed/DeleteButton";
import { CancelActivityButton } from "@/components/agenda/CancelActivityButton";
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
  rejected: "bg-voc-red-light text-voc-red-text",
  cancelled: "bg-voc-red-light text-voc-red-text",
};
const STATUS_LABEL: Record<Activity["status"], string> = {
  approved: "Goedgekeurd",
  pending: "Ter goedkeuring",
  rejected: "Afgewezen",
  cancelled: "Afgelast",
};
// UX-review T5: status ook herkenbaar voor kleurenblinden, niet alleen op kleur.
const STATUS_ICON: Record<Activity["status"], LucideIcon> = {
  approved: CheckCircle2,
  pending: Clock,
  rejected: XCircle,
  cancelled: XCircle,
};

function StatusBadge({ status }: { status: Activity["status"] }) {
  const Icon = STATUS_ICON[status];
  return (
    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}>
      <Icon size={11} />
      {STATUS_LABEL[status]}
    </span>
  );
}

const STATUS_FILTERS: { key: "alle" | Activity["status"]; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "pending", label: STATUS_LABEL.pending },
  { key: "approved", label: STATUS_LABEL.approved },
  { key: "cancelled", label: STATUS_LABEL.cancelled },
  { key: "rejected", label: STATUS_LABEL.rejected },
];

function profileName(p: { first_name: string; last_name: string } | null): string {
  return p ? `${p.first_name} ${p.last_name}` : "Onbekend";
}

// Overzicht van alle activiteiten (elke status) met de statussen en
// beheeracties direct in de lijst — i.p.v. per activiteit eerst naar de
// detailpagina te moeten voor goedkeuren/afwijzen/bewerken/verwijderen.
export async function BeheerAgendaContent({ searchParams }: { searchParams?: Promise<{ status?: string }> }) {
  await requireBoard();
  const { status } = (await searchParams) ?? {};
  const activeFilter = STATUS_FILTERS.some((f) => f.key === status) ? (status as (typeof STATUS_FILTERS)[number]["key"]) : "alle";
  const supabase = await createClient();

  let query = supabase
    .from("activities")
    .select("*, created_by_profile:profiles!activities_created_by_fkey(first_name, last_name)")
    .order("starts_at", { ascending: true });
  if (activeFilter !== "alle") query = query.eq("status", activeFilter);

  const { data: activities } = await query.returns<ActivityWithCreator[]>();

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

  // UX-review punt 21: verwijderen cascadet aanmeldingen weg zonder melding
  // — hier opgehaald zodat de rij "Afgelasten" i.p.v. "Verwijderen" kan
  // aanbieden zodra er daadwerkelijk aanmeldingen zijn.
  const { data: registrationRows } =
    activityIds.length > 0
      ? await supabase.from("activity_registrations").select("activity_id").in("activity_id", activityIds)
      : { data: [] as { activity_id: string }[] };
  const registrationCounts = new Map<string, number>();
  for (const row of registrationRows ?? []) {
    registrationCounts.set(row.activity_id, (registrationCounts.get(row.activity_id) ?? 0) + 1);
  }

  return (
    <div>
      <PageHeader
        title="Agenda beheren"
        description="Alle activiteiten met status, goedkeuren/afwijzen/bewerken/verwijderen."
        action={
          <Link
            href="/agenda/nieuw"
            className="flex items-center justify-center gap-1.5 rounded-full bg-voc-red px-3 py-1.5 text-sm font-medium text-white hover:bg-voc-red-dark"
          >
            <Plus size={16} />
            Nieuwe activiteit
          </Link>
        }
        floatingAction={
          <Link
            href="/agenda/nieuw"
            aria-label="Nieuwe activiteit"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-voc-red text-white shadow-lg hover:bg-voc-red-dark"
          >
            <Plus size={24} />
          </Link>
        }
      />

      <div className="mb-4 flex gap-1.5 overflow-x-auto">
        {STATUS_FILTERS.map((filter) => (
          <Link
            key={filter.key}
            href={filter.key === "alle" ? "/beheer/agenda" : `/beheer/agenda?status=${filter.key}`}
            className={clsx(
              "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium",
              activeFilter === filter.key ? "bg-voc-red text-white" : "bg-black/[.06] text-muted dark:bg-white/[.08]"
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {(activities ?? []).length === 0 && (
          <ComingSoon icon={CalendarDays} title="Geen activiteiten gevonden" description="Pas het filter aan of maak een nieuwe activiteit aan." />
        )}
        {(activities ?? []).map((activity) => {
          const decisionLog = latestLog(activity.id, ["activity_approved", "activity_rejected"]);
          const updateLog = latestLog(activity.id, ["activity_updated"]);
          const creatorName = profileName(activity.created_by_profile);
          const registrationCount = registrationCounts.get(activity.id) ?? 0;

          return (
          <div key={activity.id} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <StatusBadge status={activity.status} />
                  {activity.source === "lid" && (
                    <span className="rounded-full bg-black/[.06] px-2 py-0.5 text-xs font-medium text-muted dark:bg-white/[.08]">
                      Door lid toegevoegd
                    </span>
                  )}
                </div>
                <Link href={`/agenda/${activity.id}`} className="text-sm font-medium text-foreground hover:text-voc-red-text">
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
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:border-voc-red hover:text-voc-red-text"
                >
                  <Pencil size={14} />
                </Link>
                {activity.status !== "cancelled" && registrationCount > 0 ? (
                  <CancelActivityButton
                    activityId={activity.id}
                    activityTitle={activity.title}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-voc-red-text hover:border-voc-red"
                  />
                ) : (
                  <DeleteButton
                    onDelete={deleteActivityAction.bind(null, activity.id, false)}
                    confirmMessage="Weet je zeker dat je deze activiteit wilt verwijderen?"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-voc-red-text hover:border-voc-red"
                  />
                )}
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
