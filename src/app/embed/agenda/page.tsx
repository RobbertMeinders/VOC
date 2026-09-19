import type { Metadata } from "next";
import { CalendarDays, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { formatActivityDate } from "@/lib/format/date";
import type { Database } from "@/lib/types/database";

export const metadata: Metadata = { title: "VOC Agenda" };

type Activity = Database["public"]["Tables"]["activities"]["Row"];

// Public, nav-less page meant for an Elementor/WordPress iframe on the VOC
// marketing site — no session required (activities are publicly readable,
// see supabase/migrations/0008_agenda.sql). Only upcoming activities and only
// the fields that make sense to show to a visitor who isn't a member yet;
// who's attending stays inside the portal.
export default async function AgendaEmbedPage() {
  const supabase = await createClient();

  const { data: activities } = await supabase
    .from("activities")
    .select("*")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .returns<Activity[]>();

  const imageUrls = await getSignedStorageUrls(
    supabase,
    "activity-images",
    (activities ?? []).map((a) => a.image_url)
  );

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3 bg-background p-4">
      {(activities ?? []).length === 0 && (
        <p className="py-8 text-center text-sm text-muted">Er zijn momenteel geen activiteiten gepland.</p>
      )}
      {(activities ?? []).map((activity) => {
        const imageUrl = activity.image_url ? (imageUrls.get(activity.image_url) ?? null) : null;
        return (
          <div key={activity.id} className="flex gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- a public, external-embed page: keep it framework-agnostic and dependency-free
              <img src={imageUrl} alt={activity.title} className="h-[72px] w-[72px] shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-lg bg-voc-red-light text-voc-red">
                <CalendarDays size={24} />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{activity.title}</p>
              <p className="mt-0.5 text-xs text-muted">{formatActivityDate(activity.starts_at)}</p>
              {activity.location && (
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
                  <MapPin size={12} />
                  {activity.location}
                </p>
              )}
              {activity.description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted">{activity.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
