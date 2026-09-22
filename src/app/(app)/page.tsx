import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Building2, CalendarDays, FileText, MapPin, MessageCircle, Users } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { formatActivityDate } from "@/lib/format/date";
import type { Database } from "@/lib/types/database";

export const metadata: Metadata = { title: "Home" };

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];

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
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-colors hover:border-voc-red hover:text-voc-red"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-voc-red-light text-voc-red">
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{label}</span>
        {typeof count === "number" && <span className="block text-xs text-muted">{count} bedrijven</span>}
      </span>
    </Link>
  );
}

export default async function HomePage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: activities }, { count: companyCount }] = await Promise.all([
    supabase
      .from("activities")
      .select("*")
      .eq("status", "approved")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(1)
      .returns<ActivityRow[]>(),
    supabase.from("companies").select("id", { count: "exact", head: true }),
  ]);

  const nextActivity = activities?.[0] ?? null;

  const [nextActivityImageUrl, myRegistration] = await Promise.all([
    nextActivity ? getSignedStorageUrl("activity-images", nextActivity.image_url) : Promise.resolve(null),
    nextActivity
      ? supabase
          .from("activity_registrations")
          .select("is_waitlisted")
          .eq("activity_id", nextActivity.id)
          .eq("profile_id", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Welkom terug</h1>
        <p className="mt-0.5 text-sm text-muted">Dit gebeurt er binnen de VOC-community.</p>
      </div>

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

      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Snelle toegang</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ShortcutButton href="/leden" icon={Users} label="Leden" />
        <ShortcutButton href="/bedrijven" icon={Building2} label="Bedrijven" count={companyCount ?? undefined} />
          <ShortcutButton href="/documenten" icon={FileText} label="Documenten" />
          <ShortcutButton href="/community" icon={MessageCircle} label="Community" />
        </div>
      </section>
    </div>
  );
}
