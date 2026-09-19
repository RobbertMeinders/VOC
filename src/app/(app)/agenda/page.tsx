import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CalendarPlus } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { splitUpcomingAndPast } from "@/lib/format/date";
import { isBoard } from "@/lib/auth/roles";
import { ActivityCard } from "@/components/agenda/ActivityCard";
import { ComingSoon } from "@/components/ui/ComingSoon";
import type { Database } from "@/lib/types/database";

export const metadata: Metadata = { title: "Agenda" };

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];

export default async function AgendaPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: activities }, { data: allRegistrations }, { data: myRegistrations }] = await Promise.all([
    supabase.from("activities").select("*").order("starts_at", { ascending: true }).returns<ActivityRow[]>(),
    supabase.from("activity_registrations").select("activity_id"),
    supabase.from("activity_registrations").select("activity_id").eq("profile_id", profile.id),
  ]);

  const registeredIds = new Set((myRegistrations ?? []).map((r) => r.activity_id));
  const registrationCounts = new Map<string, number>();
  for (const registration of allRegistrations ?? []) {
    registrationCounts.set(registration.activity_id, (registrationCounts.get(registration.activity_id) ?? 0) + 1);
  }
  const imageUrls = await getSignedStorageUrls(
    supabase,
    "activity-images",
    (activities ?? []).map((a) => a.image_url)
  );

  const { upcoming, past } = splitUpcomingAndPast(activities ?? []);

  function renderCard(activity: ActivityRow) {
    return (
      <ActivityCard
        key={activity.id}
        activity={activity}
        imageUrl={activity.image_url ? (imageUrls.get(activity.image_url) ?? null) : null}
        registrationCount={registrationCounts.get(activity.id) ?? 0}
        isRegistered={registeredIds.has(activity.id)}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Agenda</h1>
        {isBoard(profile.role) && (
          <Link
            href="/agenda/nieuw"
            className="flex items-center gap-1.5 rounded-full bg-voc-red px-3 py-1.5 text-sm font-medium text-white hover:bg-voc-red-dark"
          >
            <CalendarPlus size={16} />
            Nieuwe activiteit
          </Link>
        )}
      </div>

      {upcoming.length > 0 ? (
        <div className="flex flex-col gap-3">{upcoming.map(renderCard)}</div>
      ) : (
        <ComingSoon
          icon={CalendarDays}
          title="Geen activiteiten gepland"
          description="Kom later terug voor nieuwe VOC-activiteiten."
        />
      )}

      {past.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-muted">Eerdere activiteiten</h2>
          <div className="flex flex-col gap-3 opacity-70">{past.map(renderCard)}</div>
        </div>
      )}
    </div>
  );
}
