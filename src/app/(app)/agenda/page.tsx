import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronDown, Plus } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { formatMonthLabel, splitUpcomingAndPast } from "@/lib/format/date";
import { ActivityCard } from "@/components/agenda/ActivityCard";
import { WeekStrip } from "@/components/agenda/WeekStrip";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Chip } from "@/components/ui/Chip";
import { MarkSectionReadOnView } from "@/components/notifications/MarkSectionReadOnView";
import type { Database } from "@/lib/types/database";

function dayParts(iso: string) {
  const date = new Date(iso);
  return {
    day: new Intl.DateTimeFormat("nl-NL", { day: "numeric", timeZone: "Europe/Amsterdam" }).format(date),
    weekday: new Intl.DateTimeFormat("nl-NL", { weekday: "short", timeZone: "Europe/Amsterdam" }).format(date).toUpperCase(),
  };
}

export const metadata: Metadata = { title: "Agenda" };

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];

const TYPE_TABS = [
  { value: undefined, label: "Alles" },
  { value: "activiteit", label: "VOC" },
  { value: "ingebracht", label: "Extern" },
  { value: "mijn-aanmeldingen", label: "Aangemeld" },
] as const;

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const profile = await requireProfile();
  const { type } = await searchParams;
  const supabase = await createClient();

  // Performance-audit #8: aantal aanmeldingen per activiteit komt nu uit een
  // GROUP BY in de database (get_activity_registration_counts) i.p.v. de hele
  // activity_registrations-tabel op te halen om in JavaScript te tellen — dat
  // laatste raakte fout zodra de tabel boven Supabase's standaardlimiet van
  // 1000 rijen kwam (de telling werd dan stil afgekapt).
  const [{ data: allActivities }, { data: registrationCountRows }, { data: myRegistrations }] = await Promise.all([
    supabase.from("activities").select("*").order("starts_at", { ascending: true }).returns<ActivityRow[]>(),
    supabase.rpc("get_activity_registration_counts"),
    supabase.from("activity_registrations").select("activity_id, is_waitlisted").eq("profile_id", profile.id),
  ]);

  const myRegistrationByActivity = new Map((myRegistrations ?? []).map((r) => [r.activity_id, r.is_waitlisted]));

  const activities = (allActivities ?? []).filter((a) => {
    if (type === "activiteit") return a.source === "voc";
    if (type === "ingebracht") return a.source === "lid";
    if (type === "mijn-aanmeldingen") return myRegistrationByActivity.has(a.id);
    return true;
  });
  const registrationCounts = new Map<string, number>(
    (registrationCountRows ?? []).map((row) => [row.activity_id, Number(row.registered_count)])
  );
  // Thumbnail-paden in dezelfde batch-aanroep (performance-audit #1): een
  // activiteitkaart toont de foto op 112-366px, daar is de kleine versie
  // (max 800px) ruim genoeg voor. Een activiteit zonder thumbnail (nog niet
  // opnieuw ge-upload sinds deze kolom bestaat) valt terug op de volle foto.
  const imageUrls = await getSignedStorageUrls(
    supabase,
    "activity-images",
    activities.flatMap((a) => [a.image_url, a.image_thumb_url])
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

  function renderCard(activity: ActivityRow) {
    const myStatus = myRegistrationByActivity.get(activity.id);
    const imagePath = activity.image_thumb_url ?? activity.image_url;
    return (
      <ActivityCard
        key={activity.id}
        activity={activity}
        imageUrl={imagePath ? (imageUrls.get(imagePath) ?? null) : null}
        registrationCount={registrationCounts.get(activity.id) ?? 0}
        isRegistered={myStatus !== undefined}
        isWaitlisted={myStatus === true}
      />
    );
  }

  // Redesign fase 4: tijdlijn — elke kaart krijgt een eigen datumkolom
  // (groot cijfer in de kopletter + weekdag) ernaast, met een verticale
  // lijn die de hele groep verbindt. z-10 + bg-background op de datumkolom
  // zodat die lijn er zichtbaar áchter loopt i.p.v. er dwars doorheen.
  function renderTimelineGroup(items: ActivityRow[]) {
    return (
      <div className="relative flex flex-col gap-3">
        <div className="absolute bottom-2 left-[21px] top-2 w-[2px] bg-border" aria-hidden />
        {items.map((activity) => {
          const { day, weekday } = dayParts(activity.starts_at);
          return (
            <div key={activity.id} className="relative flex gap-2.5">
              <div className="z-10 flex w-11 shrink-0 flex-col items-center bg-background pt-1 leading-none">
                <span className="font-display text-2xl font-extrabold tracking-[-0.02em] text-foreground">{day}</span>
                <span className="text-[9px] font-bold tracking-wide text-muted">{weekday}</span>
              </div>
              <div className="min-w-0 flex-1">{renderCard(activity)}</div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <MarkSectionReadOnView section="agenda" />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-[1.75rem] font-extrabold tracking-[-0.03em] text-foreground sm:text-[2rem]">Agenda</h1>
        <Link
          href="/agenda/nieuw"
          className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-black/[.03] dark:hover:bg-white/[.06]"
        >
          <Plus size={16} />
          Activiteit
        </Link>
      </div>

      <div className="mb-4">
        <WeekStrip activities={(allActivities ?? []).map((a) => ({ starts_at: a.starts_at, source: a.source }))} />
      </div>

      <div className="mb-4 flex gap-1.5 overflow-x-auto">
        {TYPE_TABS.map((tab) => (
          <Chip key={tab.label} href={tab.value ? `/agenda?type=${tab.value}` : "/agenda"} active={(type ?? undefined) === tab.value}>
            {tab.label}
          </Chip>
        ))}
      </div>

      {upcoming.length > 0 ? (
        <div className="flex flex-col gap-6">
          {upcomingByMonth.map((group) => (
            <div key={group.label} className="flex flex-col gap-3">
              <h2 className="font-display pl-[56px] text-sm font-bold text-muted">{group.label}</h2>
              {renderTimelineGroup(group.items)}
            </div>
          ))}
        </div>
      ) : (
        <ComingSoon icon={CalendarDays} title="Geen activiteiten gepland" description="Er zijn momenteel geen activiteiten." />
      )}

      {/* Redesign: eerdere activiteiten ingeklapt — een native <details>
          i.p.v. een client component: geen JS nodig voor simpel
          open/dicht klappen. */}
      {past.length > 0 && (
        <details className="group mt-8">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-muted">
            <ChevronDown size={16} className="transition-transform duration-200 group-open:rotate-180" />
            Eerdere activiteiten ({past.length})
          </summary>
          {/* Lichtjes grijzer dan de rest, niet extreem, en blijft ook zo —
              geen kleur-restore bij hover (dat voelde als een onnodige
              knipper-animatie voor iets dat sowieso al voorbij is). */}
          <div className="mt-3 opacity-80 grayscale-[65%]">{renderTimelineGroup(past)}</div>
        </details>
      )}
    </div>
  );
}
