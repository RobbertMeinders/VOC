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

const TYPE_TABS = [
  { value: undefined, label: "Alles" },
  { value: "activiteit", label: "Activiteiten" },
  { value: "ingebracht", label: "Ingebracht" },
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

  const activities = (allActivities ?? []).filter((a) => {
    if (type === "activiteit") return a.source === "voc";
    if (type === "ingebracht") return a.source === "lid";
    return true;
  });

  // "Ingebracht door X · Bedrijf" op ingebrachte activiteiten — één batch-
  // query voor alle betrokken indieners i.p.v. per kaart, en dus ook alleen
  // uitgevoerd als er daadwerkelijk ingebrachte activiteiten in beeld zijn.
  const submitterIds = Array.from(
    new Set(activities.filter((a) => a.source === "lid" && a.created_by).map((a) => a.created_by as string))
  );
  const submitterLabels = new Map<string, string>();
  if (submitterIds.length > 0) {
    const { data: submitters } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, company_members(is_primary, company:companies(name))")
      .in("id", submitterIds)
      .returns<
        {
          id: string;
          first_name: string;
          last_name: string;
          company_members: { is_primary: boolean; company: { name: string } | null }[];
        }[]
      >();
    for (const s of submitters ?? []) {
      const membership = s.company_members.find((m) => m.is_primary) ?? s.company_members[0];
      const name = `${s.first_name} ${s.last_name}`;
      submitterLabels.set(s.id, membership?.company ? `${name} · ${membership.company.name}` : name);
    }
  }

  const myRegistrationByActivity = new Map((myRegistrations ?? []).map((r) => [r.activity_id, r.is_waitlisted]));
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

  function renderCard(activity: ActivityRow) {
    const myStatus = myRegistrationByActivity.get(activity.id);
    return (
      <ActivityCard
        key={activity.id}
        activity={activity}
        imageUrl={activity.image_url ? (imageUrls.get(activity.image_url) ?? null) : null}
        registrationCount={registrationCounts.get(activity.id) ?? 0}
        isRegistered={myStatus !== undefined}
        isWaitlisted={myStatus === true}
        submitterLabel={activity.created_by ? (submitterLabels.get(activity.created_by) ?? null) : null}
      />
    );
  }

  return (
    <div>
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

      <div className="mb-4 inline-flex rounded-lg border border-border bg-surface p-1">
        {TYPE_TABS.map((tab) => {
          const active = (type ?? undefined) === tab.value;
          return (
            <Link
              key={tab.label}
              href={tab.value ? `/agenda?type=${tab.value}` : "/agenda"}
              className={
                active
                  ? "rounded-md bg-voc-red px-3 py-1.5 text-sm font-medium text-white"
                  : "rounded-md px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground"
              }
            >
              {tab.label}
            </Link>
          );
        })}
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
