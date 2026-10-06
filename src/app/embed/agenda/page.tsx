import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { formatActivityDate } from "@/lib/format/date";
import { EmbedAutoHeight } from "@/components/embed/EmbedAutoHeight";
import type { Database } from "@/lib/types/database";

export const metadata: Metadata = { title: "VOC Agenda" };

type Activity = Database["public"]["Tables"]["activities"]["Row"];

// Public, nav-less page meant for an Elementor/WordPress iframe on the VOC
// marketing site — no session required (activities are publicly readable,
// see supabase/migrations/0008_agenda.sql). Alleen goedgekeurde activiteiten
// (community-inzendingen die nog wachten op goedkeuring horen hier niet
// tussen te staan). Elk item linkt door naar de publieke detailpagina, die
// ook het aanmeldformulier (of de inlogmuur) toont — zie
// supabase/migrations/0047_public_agenda_registration.sql.
const PAST_ACTIVITIES_LIMIT = 6;

// Fotokaart voor zowel aankomend als eerder — image-first, zo min mogelijk
// tekst (geen omschrijving meer op het overzicht, die staat al op de
// detailpagina). isPast dooft 'm iets (grijzer, geen hover-zoom) zonder
// 'm te verstoppen — juist bewust getoond, laat zien dat de club actief is.
function ActivityCard({
  activity,
  imageUrl,
  count,
  isPast = false,
}: {
  activity: Activity;
  imageUrl: string | null;
  count: number;
  isPast?: boolean;
}) {
  return (
    <Link
      href={`/embed/agenda/${activity.id}`}
      className={`overflow-hidden rounded-2xl border border-border bg-surface shadow-sm ${
        isPast ? "opacity-80 grayscale-[50%]" : "transition-all duration-500 ease-out hover:scale-[1.008] hover:shadow-md"
      }`}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- a public, external-embed page: keep it framework-agnostic and dependency-free
        <img src={imageUrl} alt={activity.title} className="h-48 w-full object-cover" />
      ) : (
        <div className="flex h-48 w-full items-center justify-center bg-voc-red-light text-voc-red-text">
          <CalendarDays size={32} />
        </div>
      )}
      <div className="p-3">
        <p className="truncate text-sm font-semibold text-foreground">{activity.title}</p>
        <p className="mt-0.5 text-xs text-muted">{formatActivityDate(activity.starts_at)}</p>
        {activity.location && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
            <MapPin size={12} />
            {activity.location}
          </p>
        )}
        <p className="mt-1 flex items-center gap-1 text-xs text-muted">
          <Users size={12} />
          {count} aanmeldingen
        </p>
      </div>
    </Link>
  );
}

export default async function AgendaEmbedPage({ searchParams }: { searchParams: Promise<{ activiteit?: string }> }) {
  const { activiteit } = await searchParams;
  const supabase = await createClient();

  // Komt van het scriptje in de gegenereerde embed-code (/beheer/embed-codes),
  // dat een #-anker op de WordPress-pagina (bv. "#open-borrel", gezet door
  // de "Delen"-knop) doorgeeft als ?activiteit=<slug> — zoek 'm op en spring
  // meteen door naar de detailpagina, i.p.v. eerst de lijst te tonen.
  // Onvindbare/verlopen slug: geen foutmelding, gewoon de normale lijst.
  if (activiteit) {
    const { data: match } = await supabase
      .from("activities")
      .select("id")
      .eq("slug", activiteit)
      .eq("status", "approved")
      .maybeSingle();
    if (match) redirect(`/embed/agenda/${match.id}`);
  }

  const [{ data: upcoming }, { data: past }] = await Promise.all([
    supabase
      .from("activities")
      .select("*")
      .eq("status", "approved")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .returns<Activity[]>(),
    supabase
      .from("activities")
      .select("*")
      .eq("status", "approved")
      .lt("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: false })
      .limit(PAST_ACTIVITIES_LIMIT)
      .returns<Activity[]>(),
  ]);

  const allActivities = [...(upcoming ?? []), ...(past ?? [])];

  const [imageUrls, counts] = await Promise.all([
    getSignedStorageUrls(
      supabase,
      "activity-images",
      allActivities.map((a) => a.image_url)
    ),
    Promise.all(
      allActivities.map(async (a) => {
        const { data } = await supabase.rpc("get_activity_interest_count", { p_activity_id: a.id });
        return [a.id, data ?? 0] as const;
      })
    ).then((entries) => new Map(entries)),
  ]);

  return (
    // data-theme="light" + min-h-screen: dwingt het lichte thema af voor de
    // HELE zichtbare iframe-hoogte, niet alleen voor de inhoud zelf. Zonder
    // min-h-screen dekt deze div alleen zijn eigen (kortere) inhoud af — het
    // stuk daaronder blijft dan <body> zelf, die bij een donker OS-thema
    // alsnog donker inkleurt en als een zwarte balk onderin zichtbaar werd.
    <div data-theme="light" className="min-h-screen bg-surface">
      <div className="flex flex-col gap-6 p-4">
        <EmbedAutoHeight />
        {/* Deze titel + intro staan hier i.p.v. los op de WordPress-pagina
            zelf, juist zodat ze ALLEEN op dit overzicht staan — klik je door
            naar een activiteit, dan verandert alleen de inhoud van de iframe
            (deze tekst hoort daar niet meer thuis) i.p.v. dat 'm op de
            WordPress-pagina blijft hangen omdat die buiten de iframe valt. */}
        <div>
          <h2 className="text-xl font-semibold text-foreground">De activiteiten</h2>
          <p className="mt-2 text-sm text-muted">
            De Veendammer OndernemersCompagnie organiseert het hele jaar door activiteiten voor en door ondernemers
            in Veendam en omgeving. Van informele borrels en kennissessies tot bedrijfsbezoeken en een groot
            eindejaarsfeest, er is voor ieder wat wils.
          </p>
          <p className="mt-2 text-sm text-muted">
            Alle activiteiten zijn bedoeld om ondernemers samen te brengen, kennis te delen en het netwerk in de
            regio te versterken. Aanmelden is verplicht in verband met de organisatie.
          </p>
        </div>

        {(upcoming ?? []).length === 0 && (
          <p className="py-4 text-center text-sm text-muted">Er zijn momenteel geen activiteiten gepland.</p>
        )}
        {(upcoming ?? []).length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(upcoming ?? []).map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                imageUrl={activity.image_url ? (imageUrls.get(activity.image_url) ?? null) : null}
                count={counts.get(activity.id) ?? 0}
              />
            ))}
          </div>
        )}

        {(past ?? []).length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-foreground">Eerdere activiteiten</h3>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(past ?? []).map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  imageUrl={activity.image_url ? (imageUrls.get(activity.image_url) ?? null) : null}
                  count={counts.get(activity.id) ?? 0}
                  isPast
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
