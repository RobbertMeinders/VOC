import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CalendarPlus } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { formatMonthLabel, splitUpcomingAndPast } from "@/lib/format/date";
import { isBoard } from "@/lib/auth/roles";
import { ActivityCard } from "@/components/agenda/ActivityCard";
import { ComingSoon } from "@/components/ui/ComingSoon";
import type { Database } from "@/lib/types/database";

export const metadata: Metadata = { title: "Agenda" };

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];

const TYPE_TABS = [
  { value: undefined, label: "Alles" },
  { value: "activiteit", label: "Activiteiten" },
  { value: "ingebracht", label: "Door lid toegevoegd" },
  { value: "mijn-aanmeldingen", label: "Mijn aanmeldingen" },
] as const;

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const profile = await requireProfile();
  const { type } = await searchParams;
  const supabase = await createClient();

  const [{ data: allActivities }, { data: allRegistrations }, { data: myRegistrations }] = await Promise.all([
    supabase.from("activities").select("*").order("starts_at", { ascending: true }).returns<ActivityRow[]>(),
    supabase.from("activity_registrations").select("activity_id, is_waitlisted"),
    supabase.from("activity_registrations").select("activity_id, is_waitlisted").eq("profile_id", profile.id),
  ]);

  const myRegistrationByActivity = new Map((myRegistrations ?? []).map((r) => [r.activity_id, r.is_waitlisted]));

  const activities = (allActivities ?? []).filter((a) => {
    if (type === "activiteit") return a.source === "voc";
    if (type === "ingebracht") return a.source === "lid";
    if (type === "mijn-aanmeldingen") return myRegistrationByActivity.has(a.id);
    return true;
  });
  const registrationCounts = new Map<string, number>();
  for (const registration of allRegistrations ?? []) {
    if (registration.is_waitlisted) continue;
    registrationCounts.set(registration.activity_id, (registrationCounts.get(registration.activity_id) ?? 0) + 1);
  }
  const imageUrls = await getSignedStorageUrls(
    supabase,
    "activity-images",
    activities.map((a) => a.image_url)
  );

  const { upcoming, past } = splitUpcomingAndPast(activities);

  // Groepeert op maand zodat de lijst niet als één ononderbroken stapel
  // bijna-identieke kaarten oogt — `upcoming` is al oplopend gesorteerd, dus
  // een simpele opeenvolgende groepering (i.p.v. Map) volstaat.
  const upcomingByMonth: { label: string; items: ActivityRow[] }[] = [];
  for (const activity of upcoming) {
    const label = formatMonthLabel(activity.starts_at);
    const lastGroup = upcomingByMonth[upcomingByMonth.length - 1];
    if (lastGroup?.label === label) {
      lastGroup.items.push(activity);
    } else {
      upcomingByMonth.push({ label, items: [activity] });
    }
  }

  function renderCard(activity: ActivityRow, hero = false) {
    const myStatus = myRegistrationByActivity.get(activity.id);
    return (
      <ActivityCard
        key={activity.id}
        activity={activity}
        imageUrl={activity.image_url ? (imageUrls.get(activity.image_url) ?? null) : null}
        registrationCount={registrationCounts.get(activity.id) ?? 0}
        isRegistered={myStatus !== undefined}
        isWaitlisted={myStatus === true}
        hero={hero}
      />
    );
  }

  return (
    <div className="mx-auto w-full md:max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Agenda</h1>
        <Link
          href="/agenda/nieuw"
          className="flex items-center gap-1.5 rounded-full bg-voc-red px-3 py-1.5 text-sm font-medium text-white hover:bg-voc-red-dark"
        >
          <CalendarPlus size={16} />
          {isBoard(profile.role) ? "Nieuwe activiteit" : "Agenda activiteit toevoegen"}
        </Link>
      </div>

      <div className="mb-4 flex overflow-x-auto rounded-lg border border-border bg-surface p-1">
        {TYPE_TABS.map((tab) => {
          const active = (type ?? undefined) === tab.value;
          return (
            <Link
              key={tab.label}
              href={tab.value ? `/agenda?type=${tab.value}` : "/agenda"}
              className={
                active
                  ? "shrink-0 rounded-md bg-voc-red px-3 py-1.5 text-sm font-medium text-white"
                  : "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground"
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {upcoming.length > 0 ? (
        <div className="flex flex-col gap-6">
          {upcomingByMonth.map((group, groupIndex) => (
            <div key={group.label} className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-muted">{group.label}</h2>
              {group.items.map((activity, i) => renderCard(activity, groupIndex === 0 && i === 0))}
            </div>
          ))}
        </div>
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
          {/* Lichtjes grijzer dan de rest, niet extreem, en blijft ook zo —
              geen kleur-restore bij hover (dat voelde als een onnodige
              knipper-animatie voor iets dat sowieso al voorbij is). */}
          <div className="flex flex-col gap-3 opacity-80 grayscale-[65%]">{past.map((activity) => renderCard(activity))}</div>
        </div>
      )}
    </div>
  );
}
