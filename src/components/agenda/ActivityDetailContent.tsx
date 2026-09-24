import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, Download, MapPin, Pencil, Users } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl, getSignedStorageUrls } from "@/lib/supabase/storage";
import { isBoard } from "@/lib/auth/roles";
import { formatActivityDate, formatActivityTimeOnly } from "@/lib/format/date";
import { RegisterButton } from "@/components/agenda/RegisterButton";
import { AttendeeList } from "@/components/agenda/AttendeeList";
import { DeleteButton } from "@/components/feed/DeleteButton";
import { ActivityAttachmentRow } from "@/components/agenda/ActivityAttachmentRow";
import { RejectActivityForm } from "@/components/agenda/RejectActivityForm";
import { ApproveActivityForm } from "@/components/agenda/ApproveActivityForm";
import { deleteActivityAction, decideActivitySubmissionAction } from "@/app/(app)/agenda/actions";
import { logEvent } from "@/lib/events/log";
import type { Database } from "@/lib/types/database";

type Activity = Database["public"]["Tables"]["activities"]["Row"];
type Attachment = Database["public"]["Tables"]["activity_attachments"]["Row"];

export async function getActivityTitle(id: string): Promise<string> {
  const supabase = await createClient();
  const { data: activity } = await supabase.from("activities").select("title").eq("id", id).maybeSingle();
  return activity?.title ?? "Activiteit";
}

// Gedeeld tussen de volledige pagina (/agenda/[id]) en de intercepted
// overlay (@modal/(.)agenda/[id]) — zie MemberProfileContent voor dezelfde
// reden.
export async function ActivityDetailContent({ id }: { id: string }) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: activity } = await supabase.from("activities").select("*").eq("id", id).maybeSingle<Activity>();
  if (!activity) {
    notFound();
  }

  await logEvent("activity_viewed", "activity", activity.id);

  type RegistrationRow = {
    id: string;
    is_waitlisted: boolean;
    attended: boolean;
    profile: { id: string; first_name: string; last_name: string; avatar_url: string | null } | null;
  };
  type SubmitterRow = {
    first_name: string;
    last_name: string;
    company_members: { is_primary: boolean; company: { name: string } | null }[];
  };

  // Alle onafhankelijke queries (incl. de indiener, voorheen pas hierna en
  // apart gewacht) samen in één Promise.all i.p.v. na elkaar — dat scheelt
  // een volledige netwerk-rondgang bij het openen van deze pagina/overlay.
  const [imageUrl, { data: registrations }, { data: myRegistration }, { data: attachments }, { data: submitter }] =
    await Promise.all([
      getSignedStorageUrl("activity-images", activity.image_url),
      supabase
        .from("activity_registrations")
        .select("id, is_waitlisted, attended, profile:profiles(id, first_name, last_name, avatar_url)")
        .eq("activity_id", id)
        .order("created_at", { ascending: true })
        .returns<RegistrationRow[]>(),
      supabase
        .from("activity_registrations")
        .select("id, is_waitlisted")
        .eq("activity_id", id)
        .eq("profile_id", profile.id)
        .maybeSingle(),
      supabase
        .from("activity_attachments")
        .select("*")
        .eq("activity_id", id)
        .order("created_at", { ascending: true })
        .returns<Attachment[]>(),
      activity.source === "lid" && activity.created_by
        ? supabase
            .from("profiles")
            .select("first_name, last_name, company_members(is_primary, company:companies(name))")
            .eq("id", activity.created_by)
            .maybeSingle<SubmitterRow>()
        : Promise.resolve({ data: null as SubmitterRow | null }),
    ]);

  let submitterLabel: string | null = null;
  if (submitter) {
    const membership = submitter.company_members.find((m) => m.is_primary) ?? submitter.company_members[0];
    const name = `${submitter.first_name} ${submitter.last_name}`;
    submitterLabel = membership?.company ? `${name} · ${membership.company.name}` : name;
  }

  const confirmedRegistrations = (registrations ?? []).filter((r) => !r.is_waitlisted);
  const waitlistedRegistrations = (registrations ?? []).filter((r) => r.is_waitlisted);
  const confirmedCount = confirmedRegistrations.length;

  // De twee signed-URL-batches zijn onafhankelijk van elkaar (bijlagen vs.
  // aanwezigen-avatars) — ook hier parallel i.p.v. na elkaar.
  const [attachmentUrls, attendeeAvatarUrls] = await Promise.all([
    getSignedStorageUrls(
      supabase,
      "activity-attachments",
      (attachments ?? []).map((a) => a.storage_path)
    ),
    getSignedStorageUrls(
      supabase,
      "avatars",
      confirmedRegistrations.map((r) => r.profile?.avatar_url ?? null)
    ),
  ]);
  const attendees = confirmedRegistrations
    .filter((r): r is RegistrationRow & { profile: NonNullable<RegistrationRow["profile"]> } => r.profile !== null)
    .map((r) => ({
      id: r.profile.id,
      first_name: r.profile.first_name,
      last_name: r.profile.last_name,
      avatarUrl: r.profile.avatar_url ? (attendeeAvatarUrls.get(r.profile.avatar_url) ?? null) : null,
      registrationId: r.id,
      attended: r.attended,
    }));

  const isFull = activity.max_participants !== null && confirmedCount >= activity.max_participants;
  const deadlinePassed = activity.registration_deadline
    ? new Date(activity.registration_deadline) < new Date()
    : false;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={activity.title}
            width={0}
            height={0}
            sizes="(min-width: 640px) 640px, 100vw"
            className="max-h-64 w-full object-cover"
            style={{ width: "100%", height: "auto" }}
          />
        )}
        <div className="p-6">
          {(activity.source === "lid" || activity.status !== "approved") && (
            <div className="mb-2 flex flex-wrap gap-2">
              {activity.source === "lid" && (
                <span className="rounded-full bg-black/[.06] px-2 py-0.5 text-xs font-medium text-muted dark:bg-white/[.08]">
                  Ingebracht
                </span>
              )}
              {activity.status === "pending" && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                  Ter goedkeuring
                </span>
              )}
              {activity.status === "rejected" && (
                <span className="rounded-full bg-voc-red-light px-2 py-0.5 text-xs font-medium text-voc-red">
                  Afgewezen
                </span>
              )}
            </div>
          )}
          {activity.status === "rejected" && activity.rejection_reason && (
            <p className="mb-2 rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red">
              {activity.rejection_reason}
            </p>
          )}
          <h1 className="text-xl font-semibold text-foreground">{activity.title}</h1>
          {submitterLabel && <p className="mt-1 text-xs text-muted">Ingebracht door {submitterLabel}</p>}
          <div className="mt-3 flex flex-col gap-2 text-sm text-muted">
            <span className="flex items-center gap-2">
              <CalendarDays size={16} />
              {formatActivityDate(activity.starts_at)}
              {activity.ends_at && ` – ${formatActivityTimeOnly(activity.ends_at)}`}
            </span>
            {activity.location && (
              <span className="flex items-center gap-2">
                <MapPin size={16} />
                {activity.location}
              </span>
            )}
            <span className="flex items-center gap-2">
              <Users size={16} />
              {confirmedCount} aangemeld
              {activity.max_participants ? ` (max. ${activity.max_participants})` : ""}
              {waitlistedRegistrations.length > 0 && ` · ${waitlistedRegistrations.length} op wachtlijst`}
            </span>
          </div>

          {activity.description && (
            <p className="mt-4 whitespace-pre-wrap text-sm text-foreground">{activity.description}</p>
          )}

          <div className="mt-5">
            {activity.external_registration_url ? (
              <a
                href={activity.external_registration_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-voc-red px-4 py-2 text-sm font-medium text-white hover:bg-voc-red-dark"
              >
                Aanmelden via externe website
              </a>
            ) : (
              <RegisterButton
                activityId={activity.id}
                initialRegistered={Boolean(myRegistration)}
                initialWaitlisted={Boolean(myRegistration?.is_waitlisted)}
                isFull={isFull}
                deadlinePassed={deadlinePassed}
              />
            )}
            {activity.registration_deadline && !deadlinePassed && (
              <p className="mt-2 text-xs text-muted">
                Aanmelden kan tot {formatActivityDate(activity.registration_deadline)}.
              </p>
            )}
            <a
              href={`/agenda/${activity.id}/ics`}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-voc-red"
            >
              <Download size={13} />
              Toevoegen aan agenda (.ics)
            </a>
          </div>
        </div>
      </div>

      <AttendeeList
        attendees={attendees}
        waitlistCount={waitlistedRegistrations.length}
        activityId={id}
        canManage={isBoard(profile.role)}
      />

      {(attachments ?? []).length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Bijlagen</h2>
          <div className="flex flex-col gap-2">
            {(attachments ?? []).map((attachment) => (
              <ActivityAttachmentRow
                key={attachment.id}
                attachment={attachment}
                url={attachmentUrls.get(attachment.storage_path) ?? null}
                canManage={false}
              />
            ))}
          </div>
        </div>
      )}

      {isBoard(profile.role) && activity.status === "pending" && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="mr-auto text-sm text-muted">Deze activiteit wacht nog op een besluit.</p>
          <ApproveActivityForm
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

      {isBoard(profile.role) && (
        <div className="flex items-center gap-2">
          <Link
            href={`/agenda/${activity.id}/bewerken`}
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:border-voc-red"
          >
            <Pencil size={14} />
            Bewerken
          </Link>
          <DeleteButton
            onDelete={deleteActivityAction.bind(null, activity.id)}
            confirmMessage="Weet je zeker dat je deze activiteit wilt verwijderen? Aanmeldingen worden ook verwijderd."
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-voc-red hover:border-voc-red"
          />
        </div>
      )}

      {!isBoard(profile.role) && activity.created_by === profile.id && activity.status === "pending" && (
        <DeleteButton
          onDelete={deleteActivityAction.bind(null, activity.id)}
          confirmMessage="Weet je zeker dat je deze inzending wilt intrekken?"
          className="flex items-center gap-1.5 self-start rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-voc-red hover:border-voc-red"
        />
      )}
    </div>
  );
}
