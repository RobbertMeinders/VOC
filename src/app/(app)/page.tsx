import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Building2, CalendarDays, FileText, MapPin, Megaphone, MessageCircle, Users } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { formatActivityDate } from "@/lib/format/date";
import type { Database } from "@/lib/types/database";

export const metadata: Metadata = { title: "Home" };

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];
type NewsItemRow = Database["public"]["Tables"]["news_items"]["Row"];

function ShortcutButton({
  href,
  icon: Icon,
  label,
  count,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-surface px-3 py-5 text-center shadow-sm transition-all duration-500 ease-out hover:-translate-y-0.5 hover:border-voc-red hover:shadow-md"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-voc-red-light text-voc-red transition-transform duration-500 ease-out group-hover:scale-105">
        <Icon size={26} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground group-hover:text-voc-red">{label}</span>
        {typeof count === "number" && <span className="block text-xs text-muted">{count} bedrijven</span>}
      </span>
    </Link>
  );
}

export default async function HomePage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: activities }, { count: companyCount }, { data: newsItems }] = await Promise.all([
    supabase
      .from("activities")
      .select("*")
      .eq("status", "approved")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(1)
      .returns<ActivityRow[]>(),
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("news_items").select("*").order("created_at", { ascending: false }).limit(1).returns<NewsItemRow[]>(),
  ]);

  const nextActivity = activities?.[0] ?? null;
  const latestNews = newsItems?.[0] ?? null;

  const [nextActivityImageUrl, myRegistration, newsImageUrl] = await Promise.all([
    nextActivity ? getSignedStorageUrl("activity-images", nextActivity.image_url) : Promise.resolve(null),
    nextActivity
      ? supabase
          .from("activity_registrations")
          .select("is_waitlisted")
          .eq("activity_id", nextActivity.id)
          .eq("profile_id", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    latestNews ? getSignedStorageUrl("news-images", latestNews.image_url) : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Welkom terug, {profile.first_name}</h1>
        <p className="mt-0.5 text-sm text-muted">
          Het laatste nieuws en de eerstvolgende activiteit van het ledenportaal, overzichtelijk bij elkaar.
        </p>
      </div>

      {latestNews && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">Nieuws</h2>
          <Link href="/nieuws" className="group relative block h-80 overflow-hidden rounded-2xl shadow-sm sm:h-[28rem]">
            {newsImageUrl ? (
              <Image
                src={newsImageUrl}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 768px"
                className="object-cover object-[center_30%] transition-transform duration-700 ease-out group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-voc-red">
                <Megaphone size={72} className="text-white/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/0" />
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
              <span className="inline-block rounded-full bg-voc-red px-2.5 py-1 text-xs font-semibold text-white">
                Nieuws
              </span>
              <p className="mt-2 line-clamp-2 text-xl font-bold leading-tight text-white sm:text-3xl">
                {latestNews.title}
              </p>
              {latestNews.subtitle && (
                <p className="mt-1 line-clamp-1 text-sm font-medium text-white/90 sm:text-base">{latestNews.subtitle}</p>
              )}
              <p className="mt-1.5 line-clamp-2 text-sm text-white/70 sm:line-clamp-1">{latestNews.body}</p>
            </div>
          </Link>
          <Link
            href="/nieuws"
            className="mt-3 flex h-10 w-full items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition-all duration-150 hover:bg-black/[.03] active:scale-95 dark:hover:bg-white/[.06]"
          >
            Alle nieuws
          </Link>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Snelle toegang</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ShortcutButton href="/leden" icon={Users} label="Leden" />
          <ShortcutButton href="/bedrijven" icon={Building2} label="Bedrijven" count={companyCount ?? undefined} />
          <ShortcutButton href="/documenten" icon={FileText} label="Documenten" />
          <ShortcutButton href="/community" icon={MessageCircle} label="Community" />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Eerstvolgende activiteit</h2>
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
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-voc-red-light text-voc-red sm:h-24 sm:w-24">
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
        <Link
          href="/agenda"
          className="mt-3 flex h-10 w-full items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition-all duration-150 hover:bg-black/[.03] active:scale-95 dark:hover:bg-white/[.06]"
        >
          Hele agenda
        </Link>
      </section>
    </div>
  );
}
