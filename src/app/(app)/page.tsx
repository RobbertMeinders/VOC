import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, FileText, SquarePen, UserRoundSearch } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { formatActivityDateCompact, formatActivityTimeOnly, formatTodayLabel, getGreeting } from "@/lib/format/date";
import { Avatar } from "@/components/ui/Avatar";
import { NewsHeroCarousel } from "@/components/home/NewsHeroCarousel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { RecentPostPreview } from "@/components/feed/RecentPostPreview";
import { fetchFeedPosts } from "@/lib/feed/queries";
import { activityHref } from "@/lib/agenda/slug";
import type { Database } from "@/lib/types/database";

export const metadata: Metadata = { title: "Home" };

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];
type NewsItemRow = Database["public"]["Tables"]["news_items"]["Row"];
type NewMemberRow = {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  avatar_thumb_url: string | null;
  company_members: { is_primary: boolean; company: { id: string; name: string } | null }[];
};

const QUICK_ACTIONS = [
  { href: "/community?nieuw=1", label: "Bericht", icon: SquarePen },
  { href: "/leden?focus=1", label: "Lid zoeken", icon: UserRoundSearch },
  { href: "/agenda?type=mijn-aanmeldingen", label: "Mijn agenda", icon: CalendarCheck },
  { href: "/documenten", label: "Documenten", icon: FileText },
];

export default async function HomePage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: activities }, { data: newsItems }, { data: myRegistrationRows }, { data: newMembers }, communityPosts] = await Promise.all([
    supabase
      .from("activities")
      .select("*")
      .eq("status", "approved")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(4)
      .returns<ActivityRow[]>(),
    supabase.from("news_items").select("*").order("position", { ascending: true }).limit(3).returns<NewsItemRow[]>(),
    supabase
      .from("activity_registrations")
      .select("is_waitlisted, activity:activities(*)")
      .eq("profile_id", profile.id)
      .returns<{ is_waitlisted: boolean; activity: ActivityRow | null }[]>(),
    // Redesign fase 4: "Nieuw in het netwerk" — de meest recent aangemaakte
    // actieve profielen, zichzelf uitgesloten. Geen aparte "zichtbaar in
    // netwerk"-instelling: wie actief is, staat net zo goed al gewoon in de
    // ledenlijst (/leden) zelf.
    supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, avatar_url, avatar_thumb_url, company_members(is_primary, company:companies(id, name))"
      )
      .eq("is_active", true)
      .eq("is_organization_account", false)
      .neq("id", profile.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<NewMemberRow[]>(),
    // Afwerkronde blok 2: "Laatst in de community" op desktop — de 3 meest
    // recente berichten, zelfde ophaalfunctie als de Community-pagina zelf.
    fetchFeedPosts(supabase, profile.id, 3),
  ]);

  const nextActivity = activities?.[0] ?? null;
  // De eerstvolgende staat al in het welkomstblok; de rest vult op desktop
  // de rechterkolom, zodat Home daar niet halverwege ophoudt.
  const laterActivities = (activities ?? []).slice(1);

  const [myRegistration, newsImageUrls, newMemberAvatarUrls] = await Promise.all([
    nextActivity
      ? supabase
          .from("activity_registrations")
          .select("is_waitlisted")
          .eq("activity_id", nextActivity.id)
          .eq("profile_id", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    getSignedStorageUrls(
      supabase,
      "news-images",
      (newsItems ?? []).map((item) => item.image_url)
    ),
    getSignedStorageUrls(
      supabase,
      "avatars",
      (newMembers ?? []).flatMap((m) => [m.avatar_url, m.avatar_thumb_url])
    ),
  ]);

  const now = new Date();
  const upcomingRegistrationCount = (myRegistrationRows ?? []).filter(
    (r): r is { is_waitlisted: boolean; activity: ActivityRow } => r.activity !== null && new Date(r.activity.starts_at) >= now
  ).length;

  const newsSlides = (newsItems ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    body: item.body,
    imageUrl: item.image_url ? newsImageUrls.get(item.image_url) ?? null : null,
  }));

  // Geen cijfers verzinnen: alleen de eigen aankomende aanmeldingen zijn
  // hier als getal beschikbaar (geen "nieuwe berichten sinds laatste
  // bezoek"-teller op dit niveau van de app) — zonder data blijft de
  // begroeting gewoon leeg, geen placeholder-tekst.
  const statusLine =
    upcomingRegistrationCount > 0
      ? upcomingRegistrationCount === 1
        ? "Je bent voor 1 activiteit aangemeld"
        : `Je bent voor ${upcomingRegistrationCount} activiteiten aangemeld`
      : null;

  const newMembersWithCompany = (newMembers ?? []).map((member) => {
    const membership = member.company_members.find((m) => m.is_primary) ?? member.company_members[0];
    return { ...member, company: membership?.company ?? null };
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Welkomstblok: donkerpetrol, geen decoratie/glaseffect (redesign-
          besluit). Op desktop een brede banner (begroeting links, de
          activiteitkaart rechts); op mobiel gestapeld. */}
      <div className="animate-rise-in rounded-3xl p-5 shadow-sm sm:p-8" style={{ backgroundImage: "var(--hero-gradient)" }}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-white/60">{formatTodayLabel()}</p>
            <h1 className="font-display mt-1 text-2xl font-extrabold tracking-[-0.02em] text-white sm:text-[1.75rem]">
              {getGreeting()}, {profile.first_name}
            </h1>
            {statusLine && <p className="mt-1 text-sm text-white/70">{statusLine}</p>}

            {/* Afwerkronde blok 2: snelle acties op desktop in het
                welkomstblok zelf, als lichte pillen op de donkerpetrol
                ondergrond — het losse "Snel naar"-blok (hieronder, enkel op
                mobiel zichtbaar) verviel daarmee voor desktop. */}
            <div className="mt-4 hidden flex-wrap gap-2 lg:flex">
              {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-white/25"
                >
                  <Icon size={14} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {nextActivity && (
            <Link
              href={activityHref(nextActivity)}
              className="flex flex-col gap-3 rounded-2xl bg-surface p-3 shadow-sm hover:-translate-y-px sm:w-80 sm:shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-[46px] w-[46px] shrink-0 flex-col items-center justify-center rounded-xl bg-voc-red leading-none text-white">
                  <span className="text-[9px] font-bold uppercase tracking-wide opacity-90">
                    {new Intl.DateTimeFormat("nl-NL", { month: "short", timeZone: "Europe/Amsterdam" }).format(new Date(nextActivity.starts_at))}
                  </span>
                  <span className="font-display mt-0.5 text-xl font-extrabold">
                    {new Intl.DateTimeFormat("nl-NL", { day: "numeric", timeZone: "Europe/Amsterdam" }).format(new Date(nextActivity.starts_at))}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{nextActivity.title}</p>
                  {/* Korte notatie (dag + tijd + locatie) i.p.v. de volledige
                      "maandag 3 november, 16:00" — die verdrong in deze smalle
                      kaart de knop eronder. */}
                  <p className="truncate text-xs text-muted">
                    {formatActivityDateCompact(nextActivity.starts_at)} · {formatActivityTimeOnly(nextActivity.starts_at)}
                    {nextActivity.location ? ` · ${nextActivity.location}` : ""}
                  </p>
                </div>
              </div>
              {myRegistration.data ? (
                <span
                  className={
                    myRegistration.data.is_waitlisted
                      ? "w-full rounded-full bg-status-warning-soft py-1.5 text-center text-xs font-medium text-status-warning"
                      : "w-full rounded-full bg-status-success-soft py-1.5 text-center text-xs font-medium text-status-success"
                  }
                >
                  {myRegistration.data.is_waitlisted ? "Wachtlijst" : "Aangemeld"}
                </span>
              ) : (
                <span className="w-full rounded-full bg-voc-red py-1.5 text-center text-xs font-medium text-white">Aanmelden</span>
              )}
            </Link>
          )}
        </div>
      </div>

      {/* Mobiel: ongewijzigd t.o.v. voor de afwerkronde-herindeling —
          "Snel naar" als los blok, dan "Nieuw in het netwerk" als rij
          avatarcirkels, dan Nieuws. */}
      {/* Stijlronde: iets meer lucht tussen de blokken op mobiel (gap-8
          i.p.v. gap-6) — de volgorde blijft ongewijzigd. */}
      <div className="flex flex-col gap-8 lg:hidden">
        <section>
          <h2 className="font-display mb-2 text-[19px] font-bold tracking-[-0.015em] text-foreground">Snel naar</h2>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="flex flex-col items-center gap-1.5 text-center text-[11px] font-medium text-foreground">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-petrol-soft text-petrol">
                  <Icon size={18} />
                </span>
                {label}
              </Link>
            ))}
          </div>
        </section>

        {newMembersWithCompany.length > 0 && (
          <section>
            <SectionHeader title="Nieuw in het netwerk" href="/leden" linkLabel="Alle leden" />
            <div className="flex gap-3 overflow-x-auto pb-1">
              {newMembersWithCompany.map((member) => {
                const path = member.avatar_thumb_url ?? member.avatar_url;
                const avatarUrl = path ? (newMemberAvatarUrls.get(path) ?? null) : null;
                return (
                  <Link key={member.id} href={`/leden/${member.id}`} className="flex shrink-0 flex-col items-center gap-1.5 text-center">
                    <Avatar firstName={member.first_name} lastName={member.last_name} avatarUrl={avatarUrl} size={44} />
                    <span className="max-w-[56px] truncate text-[11px] text-muted">{member.first_name}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {newsSlides.length > 0 ? (
          <section>
            <SectionHeader title="Nieuws" href="/nieuws" linkLabel="Alle nieuws" />
            <NewsHeroCarousel slides={newsSlides} />
          </section>
        ) : (
          !nextActivity && (
            <div className="rounded-2xl bg-surface p-5 shadow-sm">
              <p className="text-sm text-muted">Er staat nog geen activiteit gepland.</p>
            </div>
          )
        )}
      </div>

      {/* Desktop: twee vaste kolommen (afwerkronde blok 2) — links Nieuws en
          "Laatst in de community", rechts Agenda (zachte petrol-tegels; enkel
          de eerstvolgende activiteit in het welkomstblok hierboven blijft
          rood) en "Nieuw in het netwerk" als naam+bedrijf-lijst. */}
      <div className="hidden gap-6 lg:grid" style={{ gridTemplateColumns: "1.75fr 1fr" }}>
        <div className="flex flex-col gap-6">
          {newsSlides.length > 0 && (
            <section>
              <SectionHeader title="Nieuws" href="/nieuws" linkLabel="Alle nieuws" />
              <NewsHeroCarousel slides={newsSlides} />
            </section>
          )}

          {communityPosts.length > 0 && (
            <section>
              <SectionHeader title="Laatst in de community" href="/community" linkLabel="Naar Community" />
              <div className="flex flex-col gap-3">
                {communityPosts.map((post) => (
                  <RecentPostPreview key={post.id} post={post} />
                ))}
              </div>
            </section>
          )}

          {newsSlides.length === 0 && communityPosts.length === 0 && !nextActivity && (
            <div className="rounded-2xl bg-surface p-5 shadow-sm">
              <p className="text-sm text-muted">Er staat nog geen activiteit gepland.</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {laterActivities.length > 0 && (
            <section>
              <SectionHeader title="Agenda" href="/agenda" linkLabel="Agenda" />
              <div className="flex flex-col divide-y divide-border rounded-2xl bg-surface shadow-sm">
                {laterActivities.map((activity) => (
                  <Link key={activity.id} href={activityHref(activity)} className="flex items-center gap-3 p-3 hover:bg-black/[.03] dark:hover:bg-white/[.05]">
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-petrol-soft leading-none text-petrol">
                      <span className="text-[8.5px] font-bold uppercase tracking-wide">
                        {new Intl.DateTimeFormat("nl-NL", { month: "short", timeZone: "Europe/Amsterdam" }).format(new Date(activity.starts_at))}
                      </span>
                      <span className="font-display mt-0.5 text-base font-extrabold">
                        {new Intl.DateTimeFormat("nl-NL", { day: "numeric", timeZone: "Europe/Amsterdam" }).format(new Date(activity.starts_at))}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{activity.title}</p>
                      <p className="truncate text-xs text-muted">
                        {formatActivityTimeOnly(activity.starts_at)}
                        {activity.location ? ` · ${activity.location}` : ""}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {newMembersWithCompany.length > 0 && (
            <section>
              <SectionHeader title="Nieuw in het netwerk" href="/leden" linkLabel="Alle leden" />
              <div className="flex flex-col divide-y divide-border rounded-2xl bg-surface shadow-sm">
                {newMembersWithCompany.map((member) => {
                  const path = member.avatar_thumb_url ?? member.avatar_url;
                  const avatarUrl = path ? (newMemberAvatarUrls.get(path) ?? null) : null;
                  return (
                    <Link
                      key={member.id}
                      href={`/leden/${member.id}`}
                      className="flex items-center gap-3 p-3 hover:bg-black/[.03] dark:hover:bg-white/[.05]"
                    >
                      <Avatar firstName={member.first_name} lastName={member.last_name} avatarUrl={avatarUrl} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {member.first_name} {member.last_name}
                        </p>
                        {member.company && <p className="truncate text-xs text-muted">{member.company.name}</p>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
