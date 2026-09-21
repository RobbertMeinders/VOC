import type { Metadata } from "next";
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
import { ActivityAttachmentUploadForm } from "@/components/agenda/ActivityAttachmentUploadForm";
import { deleteActivityAction, decideActivitySubmissionAction } from "@/app/(app)/agenda/actions";
import type { Database } from "@/lib/types/database";

type Activity = Database["public"]["Tables"]["activities"]["Row"];
type Attachment = Database["public"]["Tables"]["activity_attachments"]["Row"];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: activity } = await supabase.from("activities").select("title").eq("id", id).maybeSingle();
  return { title: activity?.title ?? "Activiteit" };
}

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: activity } = await supabase.from("activities").select("*").eq("id", id).maybeSingle<Activity>();
  if (!activity) {
    notFound();
  }

  type RegistrationRow = {
    is_waitlisted: boolean;
    profile: { id: string; first_name: string; last_name: string; avatar_url: string | null } | null;
  };

  const [imageUrl, { data: registrations }, { data: myRegistration }, { data: attachments }] = await Promise.all([
    getSignedStorageUrl("activity-images", activity.image_url),
    supabase
      .from("activity_registrations")
      .select("is_waitlisted, profile:profiles(id, first_name, last_name, avatar_url)")
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
  ]);

  const attachmentUrls = await getSignedStorageUrls(
    supabase,
    "activity-attachments",
    (attachments ?? []).map((a) => a.storage_path)
  );

  const confirmedRegistrations = (registrations ?? []).filter((r) => !r.is_waitlisted);
  const waitlistedRegistrations = (registrations ?? []).filter((r) => r.is_waitlisted);
  const confirmedCount = confirmedRegistrations.length;

  const attendeeAvatarUrls = await getSignedStorageUrls(
    supabase,
    "avatars",
    confirmedRegistrations.map((r) => r.profile?.avatar_url ?? null)
  );
  const attendees = confirmedRegistrations
    .filter((r): r is RegistrationRow & { profile: NonNullable<RegistrationRow["profile"]> } => r.profile !== null)
    .map((r) => ({
      id: r.profile.id,
      first_name: r.profile.first_name,
      last_name: r.profile.last_name,
      avatarUrl: r.profile.avatar_url ? (attendeeAvatarUrls.get(r.profile.avatar_url) ?? null) : null,
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
          <h1 className="text-xl font-semibold text-foreground">{activity.title}</h1>
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
            <RegisterButton
              activityId={activity.id}
              initialRegistered={Boolean(myRegistration)}
              initialWaitlisted={Boolean(myRegistration?.is_waitlisted)}
              isFull={isFull}
              deadlinePassed={deadlinePassed}
            />
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

      <AttendeeList attendees={attendees} waitlistCount={waitlistedRegistrations.length} />

      {((attachments ?? []).length > 0 || isBoard(profile.role)) && (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Bijlagen</h2>
          {(attachments ?? []).length > 0 && (
            <div className="mb-3 flex flex-col gap-2">
              {(attachments ?? []).map((attachment) => (
                <ActivityAttachmentRow
                  key={attachment.id}
                  attachment={attachment}
                  url={attachmentUrls.get(attachment.storage_path) ?? null}
                  canManage={isBoard(profile.role)}
                />
              ))}
            </div>
          )}
          {isBoard(profile.role) && <ActivityAttachmentUploadForm activityId={activity.id} />}
        </div>
      )}

      {isBoard(profile.role) && activity.status === "pending" && (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="mr-auto text-sm text-muted">Deze activiteit wacht nog op een besluit.</p>
          <form action={decideActivitySubmissionAction.bind(null, activity.id, "approved")}>
            <button
              type="submit"
              className="rounded-full bg-voc-red px-3 py-1.5 text-sm font-medium text-white hover:bg-voc-red-dark"
            >
              Goedkeuren
            </button>
          </form>
          <form action={decideActivitySubmissionAction.bind(null, activity.id, "rejected")}>
            <button
              type="submit"
              className="rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
            >
              Afwijzen
            </button>
          </form>
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
