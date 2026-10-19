import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, FileText, Pencil, Search } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { formatActivityDate, formatTodayLabel, getGreeting } from "@/lib/format/date";
import { Avatar } from "@/components/ui/Avatar";
import { NewsHeroCarousel } from "@/components/home/NewsHeroCarousel";
import { SectionHeader } from "@/components/ui/SectionHeader";
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
};

const QUICK_ACTIONS = [
  { href: "/community", label: "Bericht", icon: Pencil },
  { href: "/zoeken", label: "Lid zoeken", icon: Search },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/documenten", label: "Documenten", icon: FileText },
];

export default async function HomePage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: activities }, { data: newsItems }, { data: myRegistrationRows }, { data: newMembers }] = await Promise.all([
    supabase
      .from("activities")
      .select("*")
      .eq("status", "approved")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(1)
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
      .select("id, first_name, last_name, avatar_url, avatar_thumb_url")
      .eq("is_active", true)
      .neq("id", profile.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<NewMemberRow[]>(),
  ]);

  const nextActivity = activities?.[0] ?? null;

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
      ? `${upcomingRegistrationCount} ${upcomingRegistrationCount === 1 ? "aankomende aanmelding" : "aankomende aanmeldingen"}`
      : null;

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
          </div>

          {nextActivity && (
            <Link
              href={`/agenda/${nextActivity.id}`}
              className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-sm hover:-translate-y-px sm:w-80 sm:shrink-0"
            >
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
                <p className="truncate text-xs text-muted">{formatActivityDate(nextActivity.starts_at)}</p>
              </div>
              {myRegistration.data ? (
                <span
                  className={
                    myRegistration.data.is_waitlisted
                      ? "shrink-0 rounded-full bg-status-warning-soft px-2.5 py-1 text-xs font-medium text-status-warning"
                      : "shrink-0 rounded-full bg-status-success-soft px-2.5 py-1 text-xs font-medium text-status-success"
                  }
                >
                  {myRegistration.data.is_waitlisted ? "Wachtlijst" : "Aangemeld"}
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-voc-red px-3.5 py-1.5 text-xs font-medium text-white">Aanmelden</span>
              )}
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="flex flex-col gap-6 lg:order-2">
          <section>
            <h2 className="font-display mb-2 text-base font-bold text-foreground">Snel naar</h2>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="flex flex-col items-center gap-1.5 text-center text-[11px] font-medium text-foreground">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-petrol shadow-sm">
                    <Icon size={18} />
                  </span>
                  {label}
                </Link>
              ))}
            </div>
          </section>

          {newMembers && newMembers.length > 0 && (
            <section>
              <SectionHeader title="Nieuw in het netwerk" href="/leden" linkLabel="Alle leden" />
              <div className="flex gap-3 overflow-x-auto pb-1">
                {newMembers.map((member) => {
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
        </div>

        <div className="lg:order-1">
          {newsSlides.length > 0 ? (
            <section>
              <SectionHeader title="Uit de vereniging" href="/nieuws" linkLabel="Alle nieuws" />
              <NewsHeroCarousel slides={newsSlides} />
            </section>
          ) : (
            !nextActivity && (
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <p className="text-sm text-muted">Er staat nog geen activiteit gepland.</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
