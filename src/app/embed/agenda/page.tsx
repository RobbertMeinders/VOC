import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { formatActivityDate, formatActivityTimeOnly } from "@/lib/format/date";
import { EmbedAutoHeight } from "@/components/embed/EmbedAutoHeight";
import { EmbedWhiteBackground } from "@/components/embed/EmbedWhiteBackground";
import { AnimatedDisclosure } from "@/components/ui/AnimatedDisclosure";
import { isWebsiteTheme, withEmbedTheme } from "@/lib/embed/theme";
import { openSans } from "@/lib/fonts/openSans";
import type { Database } from "@/lib/types/database";

// Zelfde dag/weekdag-opmaak als de portaal-agenda (src/app/(app)/agenda/
// page.tsx) -- hier gedupliceerd i.p.v. gedeeld, want die functie is daar
// lokaal/niet-geëxporteerd (zelfde afweging als message-template-defaults.ts:
// een paar regels dubbel is goedkoper dan een gedeelde module voor zo'n
// kleine, view-specifieke opmaakfunctie).
function dayParts(iso: string) {
  const date = new Date(iso);
  return {
    day: new Intl.DateTimeFormat("nl-NL", { day: "numeric", timeZone: "Europe/Amsterdam" }).format(date),
    weekday: new Intl.DateTimeFormat("nl-NL", { weekday: "short", timeZone: "Europe/Amsterdam" }).format(date).toUpperCase(),
  };
}

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
// Image-first, zo min mogelijk tekst (geen omschrijving meer op het
// overzicht, die staat al op de detailpagina), alleen voor AANKOMENDE
// activiteiten; eerdere activiteiten gebruiken PastActivityRow hieronder.
function ActivityCard({
  activity,
  imageUrl,
  count,
  thema,
}: {
  activity: Activity;
  imageUrl: string | null;
  count: number;
  thema?: string;
}) {
  return (
    <Link
      href={withEmbedTheme(`/embed/agenda/${activity.id}`, thema)}
      className="card-surface overflow-hidden transition-all duration-500 ease-out hover:scale-[1.008] hover:shadow-md"
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
          {count} aanmelding{count === 1 ? "" : "en"}
        </p>
      </div>
    </Link>
  );
}

// Live feedback: "Eerdere activiteiten" hoort er hetzelfde uit te zien als
// op het portaal zelf (src/components/agenda/ActivityCard.tsx, niet-hero-
// variant) -- dag/weekdag-kolom, gekleurde linkerrand per soort (rood=VOC,
// petrol=extern) en dezelfde badges, i.p.v. de eerdere eigen, sterk
// afwijkende compacte rij. Geen Aangemeld/wachtlijst-badge: die zijn
// lid-specifiek en een anonieme bezoeker heeft geen eigen aanmeldstatus.
function PastActivityCard({
  activity,
  imageUrl,
  count,
  thema,
}: {
  activity: Activity;
  imageUrl: string | null;
  count: number;
  thema?: string;
}) {
  const isOfficial = activity.source === "voc";
  return (
    <Link
      href={withEmbedTheme(`/embed/agenda/${activity.id}`, thema)}
      className={clsx(
        "card-hover-lift flex items-start gap-3 overflow-hidden rounded-2xl bg-surface p-3",
        isOfficial ? "shadow-[inset_4px_0_0_0_var(--voc-red),var(--shadow-sm)]" : "shadow-[inset_4px_0_0_0_var(--petrol),var(--shadow-sm)]"
      )}
      style={
        {
          "--card-accent-shadow": isOfficial
            ? "inset 4px 0 0 0 var(--voc-red), var(--shadow-sm)"
            : "inset 4px 0 0 0 var(--petrol), var(--shadow-sm)",
        } as CSSProperties
      }
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- a public, external-embed page: keep it framework-agnostic and dependency-free
        <img src={imageUrl} alt="" className="h-[72px] w-[72px] shrink-0 rounded-xl object-cover md:h-[84px] md:w-[120px]" />
      ) : (
        <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl bg-petrol-soft text-petrol md:h-[84px] md:w-[120px]">
          <CalendarDays size={28} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-display text-base leading-snug tracking-[-0.01em] text-foreground md:text-[18px]">
          {activity.title}
        </p>
        <p className="mt-1 truncate text-sm text-muted">
          {formatActivityTimeOnly(activity.starts_at)}
          {activity.location ? ` · ${activity.location}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {isOfficial ? (
            <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger-text">VOC</span>
          ) : (
            <span className="rounded-full bg-status-neutral-soft px-2 py-0.5 text-xs font-medium text-status-neutral">Extern</span>
          )}
          <span className="flex items-center gap-1 text-xs text-muted">
            <Users size={13} />
            {count}
          </span>
        </div>
      </div>
    </Link>
  );
}

function renderPastGroup(items: Activity[], imageUrls: Map<string, string>, counts: Map<string, number>, thema?: string) {
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
            <div className="min-w-0 flex-1">
              <PastActivityCard
                activity={activity}
                imageUrl={activity.image_url ? (imageUrls.get(activity.image_url) ?? null) : null}
                count={counts.get(activity.id) ?? 0}
                thema={thema}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function AgendaEmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ activiteit?: string; thema?: string }>;
}) {
  const { activiteit, thema } = await searchParams;
  const websiteTheme = isWebsiteTheme(thema);
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
    if (match) redirect(withEmbedTheme(`/embed/agenda/${match.id}`, thema));
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
    <div
      data-theme="light"
      data-embed-theme={websiteTheme ? "website" : undefined}
      className={clsx("min-h-screen bg-surface", websiteTheme && openSans.variable)}
    >
      {/* Live feedback: breedte mag minder, dezelfde maat als de portaal-
          agenda zelf (AppShell.tsx's "lijst"-contentbreedte, 960px). */}
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-6 p-4">
        <EmbedAutoHeight />
        <EmbedWhiteBackground />
        {/* Deze titel + intro staan hier i.p.v. los op de WordPress-pagina
            zelf, juist zodat ze ALLEEN op dit overzicht staan — klik je door
            naar een activiteit, dan verandert alleen de inhoud van de iframe
            (deze tekst hoort daar niet meer thuis) i.p.v. dat 'm op de
            WordPress-pagina blijft hangen omdat die buiten de iframe valt. */}
        <div>
          <h2 className="text-xl font-semibold text-foreground">De activiteiten</h2>
          <p className="mt-2 text-sm text-muted">
            De Veendammer Ondernemers Compagnie organiseert het hele jaar door activiteiten voor en door ondernemers
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
                thema={thema}
              />
            ))}
          </div>
        )}

        {(past ?? []).length > 0 && (
          <div className="mt-2">
            <AnimatedDisclosure label={`Eerdere activiteiten (${(past ?? []).length})`} contentClassName="opacity-80 grayscale-[65%]">
              {renderPastGroup(past ?? [], imageUrls, counts, thema)}
            </AnimatedDisclosure>
          </div>
        )}
      </div>
    </div>
  );
}
