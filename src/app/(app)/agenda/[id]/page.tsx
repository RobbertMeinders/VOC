import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Pencil, Users } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { isBoard } from "@/lib/auth/roles";
import { formatActivityDate } from "@/lib/format/date";
import { RegisterButton } from "@/components/agenda/RegisterButton";
import { DeleteButton } from "@/components/feed/DeleteButton";
import { deleteActivityAction } from "@/app/(app)/agenda/actions";
import type { Database } from "@/lib/types/database";

type Activity = Database["public"]["Tables"]["activities"]["Row"];

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

  const [imageUrl, { count: registrationCount }, { data: myRegistration }] = await Promise.all([
    getSignedStorageUrl("activity-images", activity.image_url),
    supabase.from("activity_registrations").select("id", { count: "exact", head: true }).eq("activity_id", id),
    supabase
      .from("activity_registrations")
      .select("id")
      .eq("activity_id", id)
      .eq("profile_id", profile.id)
      .maybeSingle(),
  ]);

  const isFull = activity.max_participants !== null && (registrationCount ?? 0) >= activity.max_participants;
  const deadlinePassed = activity.registration_deadline
    ? new Date(activity.registration_deadline) < new Date()
    : false;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {imageUrl && (
          <div className="relative h-48 w-full">
            <Image src={imageUrl} alt={activity.title} fill className="object-cover" />
          </div>
        )}
        <div className="p-6">
          <h1 className="text-xl font-semibold text-foreground">{activity.title}</h1>
          <div className="mt-3 flex flex-col gap-2 text-sm text-muted">
            <span className="flex items-center gap-2">
              <CalendarDays size={16} />
              {formatActivityDate(activity.starts_at)}
              {activity.ends_at && ` – ${formatActivityDate(activity.ends_at)}`}
            </span>
            {activity.location && (
              <span className="flex items-center gap-2">
                <MapPin size={16} />
                {activity.location}
              </span>
            )}
            <span className="flex items-center gap-2">
              <Users size={16} />
              {registrationCount ?? 0} aangemeld
              {activity.max_participants ? ` (max. ${activity.max_participants})` : ""}
            </span>
          </div>

          {activity.description && (
            <p className="mt-4 whitespace-pre-wrap text-sm text-foreground">{activity.description}</p>
          )}

          <div className="mt-5">
            <RegisterButton
              activityId={activity.id}
              initialRegistered={Boolean(myRegistration)}
              isFull={isFull}
              deadlinePassed={deadlinePassed}
            />
            {activity.registration_deadline && !deadlinePassed && (
              <p className="mt-2 text-xs text-muted">
                Aanmelden kan tot {formatActivityDate(activity.registration_deadline)}.
              </p>
            )}
          </div>
        </div>
      </div>

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
            onDelete={() => deleteActivityAction(activity.id)}
            confirmMessage="Weet je zeker dat je deze activiteit wilt verwijderen? Aanmeldingen worden ook verwijderd."
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-voc-red hover:border-voc-red"
          />
        </div>
      )}
    </div>
  );
}
