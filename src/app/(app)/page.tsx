import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Building2, CalendarDays, FileText, MapPin, MessageCircle, Users } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl, getSignedStorageUrls } from "@/lib/supabase/storage";
import { formatActivityDate } from "@/lib/format/date";
import { ProfilePhotoPrompt } from "@/components/home/ProfilePhotoPrompt";
import { NewsHeroCarousel } from "@/components/home/NewsHeroCarousel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { Database } from "@/lib/types/database";

export const metadata: Metadata = { title: "Home" };

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];
type NewsItemRow = Database["public"]["Tables"]["news_items"]["Row"];

function ShortcutButton({
  href,
  icon: Icon,
  label,
  count,
  countLabel,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  count?: number;
  countLabel?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-surface px-3 py-5 text-center shadow-sm transition-all duration-500 ease-out hover:-translate-y-0.5 hover:border-voc-red hover:shadow-md"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-voc-red-light text-voc-red-text transition-transform duration-500 ease-out group-hover:scale-105">
        <Icon size={26} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground group-hover:text-voc-red-text">{label}</span>
        {typeof count === "number" && (
          <span className="block text-xs text-muted">
            {count} {countLabel}
          </span>
        )}
      </span>
    </Link>
  );
}

export default async function HomePage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: activities }, { count: companyCount }, { count: memberCount }, { data: newsItems }, { count: companyMemberCount }] =
    await Promise.all([
      supabase
        .from("activities")
        .select("*")
        .eq("status", "approved")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(1)
        .returns<ActivityRow[]>(),
      supabase.from("companies").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("news_items").select("*").order("position", { ascending: true }).limit(3).returns<NewsItemRow[]>(),
      supabase.from("company_members").select("id", { count: "exact", head: true }).eq("profile_id", profile.id),
    ]);

  const nextActivity = activities?.[0] ?? null;

  // UX-review punt 23: functie en bedrijf staan bij registratie in het
  // formulier, maar zijn daar niet verplicht (de uitnodigende bestuurder
  // vult ze soms niet in, en het lid kan ze bij registratie ook leeg
  // laten) — deze prompt keek eerder alleen naar de profielfoto en miste
  // dat scenario. Nog steeds laagdrempelig/wegklikbaar, geen verplichte
  // checklist.
  const missingProfileInfo = !profile.avatar_url || !profile.job_title || (companyMemberCount ?? 0) === 0;
  const showPhotoPrompt = !profile.onboarding_dismissed_at && missingProfileInfo;

  const [nextActivityImageUrl, myRegistration, newsImageUrls] = await Promise.all([
    nextActivity ? getSignedStorageUrl("activity-images", nextActivity.image_url) : Promise.resolve(null),
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
  ]);

  const newsSlides = (newsItems ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    body: item.body,
    imageUrl: item.image_url ? newsImageUrls.get(item.image_url) ?? null : null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Welkom terug, {profile.first_name}</h1>
        <p className="mt-0.5 text-sm text-muted">
          Het laatste nieuws en de eerstvolgende activiteit van het ledenportaal, overzichtelijk bij elkaar.
        </p>
      </div>

      {showPhotoPrompt && (
        <ProfilePhotoPrompt
          missingPhoto={!profile.avatar_url}
          missingJobTitle={!profile.job_title}
          missingCompany={(companyMemberCount ?? 0) === 0}
        />
      )}

      {newsSlides.length > 0 && (
        <section>
          <SectionHeader title="Nieuws" href="/nieuws" linkLabel="Alle nieuws" />
          <NewsHeroCarousel slides={newsSlides} />
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Snelle toegang</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ShortcutButton href="/leden" icon={Users} label="Leden" count={memberCount ?? undefined} countLabel="leden" />
          <ShortcutButton
            href="/bedrijven"
            icon={Building2}
            label="Bedrijven"
            count={companyCount ?? undefined}
            countLabel="bedrijven"
          />
          <ShortcutButton href="/documenten" icon={FileText} label="Documenten" />
          <ShortcutButton href="/community" icon={MessageCircle} label="Community" />
        </div>
      </section>

      <section>
        <SectionHeader title="Eerstvolgende activiteit" href="/agenda" linkLabel="Hele agenda" />
        {nextActivity ? (
          <Link
            href={`/agenda/${nextActivity.id}`}
            className="flex gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm hover:border-voc-red sm:gap-4 sm:p-5"
          >
            {nextActivityImageUrl ? (
              <Image
                src={nextActivityImageUrl}
                alt={nextActivity.title}
                width={96}
                height={96}
                className="h-16 w-16 shrink-0 rounded-xl object-cover sm:h-24 sm:w-24"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-voc-red-light text-voc-red-text sm:h-24 sm:w-24">
                <CalendarDays size={24} className="sm:hidden" />
                <CalendarDays size={30} className="hidden sm:block" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-base font-semibold leading-snug text-foreground sm:text-lg">
                {nextActivity.title}
              </p>
              <p className="mt-1 text-sm text-muted">{formatActivityDate(nextActivity.starts_at)}</p>
              {nextActivity.location && (
                <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted">
                  <MapPin size={14} />
                  {nextActivity.location}
                </p>
              )}
              {myRegistration.data && (
                <span
                  className={
                    myRegistration.data.is_waitlisted
                      ? "mt-2 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                      : "mt-2 inline-block rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400"
                  }
                >
                  {myRegistration.data.is_waitlisted ? "Op de wachtlijst" : "Je bent aangemeld"}
                </span>
              )}
            </div>
          </Link>
        ) : (
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm text-muted">Er staat nog geen activiteit gepland.</p>
          </div>
        )}
      </section>
    </div>
  );
}
