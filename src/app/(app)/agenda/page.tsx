import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { formatMonthLabel, splitUpcomingAndPast } from "@/lib/format/date";
import { ActivityCard } from "@/components/agenda/ActivityCard";
import { AgendaTypeTabs } from "@/components/agenda/AgendaTypeTabs";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { AnimatedDisclosure } from "@/components/ui/AnimatedDisclosure";
import { TabNavProvider } from "@/lib/ui/TabNavContext";
import { TabContentArea } from "@/components/ui/TabContentArea";
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

// Deze lijstpagina toont alleen wat ActivityCard/de datumkolom/de type-tabs
// nodig hebben (title/beschrijving/externe-link/deadline enz. staan pas op
// het activiteitdetail) — scheelt onnodige kolommen op een query die elke
// keer deze pagina geladen wordt opnieuw draait.
const ACTIVITY_LIST_COLUMNS = "id, title, starts_at, location, status, source, max_participants, image_url, image_thumb_url";

// Verleden activiteiten blijven zich ophopen (bron van de inklapbare
// "Eerdere activiteiten"-sectie) terwijl toekomstige/actuele er typisch maar
// een handvol tegelijk zijn — zonder limiet haalt deze query na een paar jaar
// de hele, steeds groter wordende geschiedenis op. Een nieuwe, recente
// activiteit schuift de oudste er zo nodig gewoon vanaf; niemand mist een
// activiteit van jaren terug in deze sowieso al standaard ingeklapte lijst.
const PAST_ACTIVITIES_LIMIT = 50;

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const profile = await requireProfile();
  const { type } = await searchParams;
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  // Performance-audit #8: aantal aanmeldingen per activiteit komt nu uit een
  // GROUP BY in de database (get_activity_registration_counts) i.p.v. de hele
  // activity_registrations-tabel op te halen om in JavaScript te tellen — dat
  // laatste raakte fout zodra de tabel boven Supabase's standaardlimiet van
  // 1000 rijen kwam (de telling werd dan stil afgekapt).
  const [{ data: upcomingActivities }, { data: pastActivities }, { data: registrationCountRows }, { data: myRegistrations }] =
    await Promise.all([
      supabase
        .from("activities")
        .select(ACTIVITY_LIST_COLUMNS)
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true })
        .returns<ActivityRow[]>(),
      supabase
        .from("activities")
        .select(ACTIVITY_LIST_COLUMNS)
        .lt("starts_at", nowIso)
        .order("starts_at", { ascending: false })
        .limit(PAST_ACTIVITIES_LIMIT)
        .returns<ActivityRow[]>(),
      supabase.rpc("get_activity_registration_counts"),
      supabase.from("activity_registrations").select("activity_id, is_waitlisted").eq("profile_id", profile.id),
    ]);
  const allActivities = [...(upcomingActivities ?? []), ...(pastActivities ?? [])];

  const myRegistrationByActivity = new Map((myRegistrations ?? []).map((r) => [r.activity_id, r.is_waitlisted]));

  const activities = allActivities.filter((a) => {
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

  // Ontwerpfeedback (agenda-desktop/mobiel.png): geen losse grijze
  // tijdlijnlijntjes meer tussen de kaarten — elke kaart krijgt nog wel een
  // eigen datumkolom (groot cijfer + weekdag) ernaast, nu verticaal
  // gecentreerd naast de kaart i.p.v. bovenaan uitgelijnd.
  function renderTimelineGroup(items: ActivityRow[]) {
    return (
      <div className="flex flex-col gap-3">
        {items.map((activity) => {
          const { day, weekday } = dayParts(activity.starts_at);
          return (
            <div key={activity.id} className="flex items-center gap-2.5">
              <div className="flex w-11 shrink-0 flex-col items-center leading-none">
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
    <TabNavProvider>
      <div>
        <MarkSectionReadOnView section="agenda" />
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-[1.75rem] font-extrabold tracking-[-0.03em] text-foreground sm:text-[2rem]">Agenda</h1>
          {/* Stijlronde: hoofdknop van het scherm, dus rood en met gewicht
              i.p.v. een witte outline-knop — de grote datum per activiteit
              hieronder doet het werk van de weekstrook, die is weg. */}
          <Link
            href="/agenda/nieuw"
            className="flex h-11 items-center gap-1.5 rounded-full bg-voc-red px-5 text-sm font-semibold text-white shadow-[0_6px_16px_-4px_rgba(232,0,15,0.4)] transition-all duration-150 hover:-translate-y-px hover:bg-voc-red-dark"
          >
            <Plus size={18} />
            Activiteit
          </Link>
        </div>

        <AgendaTypeTabs active={type} />

        <TabContentArea>
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

          {/* Afwerkronde blok 5: hoogte-animatie bij het uitklappen i.p.v. de
              native <details> die instant open/dicht klapte. */}
          {past.length > 0 && (
            <div className="mt-8">
              <AnimatedDisclosure label={`Eerdere activiteiten (${past.length})`} contentClassName="opacity-80 grayscale-[65%]">
                {/* Lichtjes grijzer dan de rest, niet extreem, en blijft ook zo —
                    geen kleur-restore bij hover (dat voelde als een onnodige
                    knipper-animatie voor iets dat sowieso al voorbij is). */}
                {renderTimelineGroup(past)}
              </AnimatedDisclosure>
            </div>
          )}
        </TabContentArea>
      </div>
    </TabNavProvider>
  );
}
