import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { formatActivityDate } from "@/lib/format/date";
import { PublicRegistrationForm } from "@/components/embed/PublicRegistrationForm";
import { EmbedAutoHeight } from "@/components/embed/EmbedAutoHeight";
import type { Database } from "@/lib/types/database";

type Activity = Database["public"]["Tables"]["activities"]["Row"];

export const metadata: Metadata = { title: "VOC Agenda" };

// Publieke, nav-loze detailpagina — zelfde iframe-doel als /embed/agenda
// zelf. Alleen goedgekeurde activiteiten zijn hier bereikbaar (notFound()
// voor pending/rejected of een onbestaand id), ongeacht wat iemand als URL
// intypt.
export default async function AgendaEmbedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: activity } = await supabase
    .from("activities")
    .select("*")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle<Activity>();

  if (!activity) notFound();

  const [imageUrl, { data: interestCount }] = await Promise.all([
    getSignedStorageUrl("activity-images", activity.image_url),
    supabase.rpc("get_activity_interest_count", { p_activity_id: activity.id }),
  ]);

  return (
    <div className="flex flex-col gap-4 bg-white p-4">
      <EmbedAutoHeight />
      <Link href="/embed/agenda" className="flex w-fit items-center gap-1.5 text-sm font-medium text-voc-red hover:underline">
        <ArrowLeft size={16} />
        Terug naar agenda
      </Link>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- publieke, external-embed pagina: geen framework-afhankelijkheden
        <img src={imageUrl} alt={activity.title} className="h-48 w-full rounded-xl object-cover" />
      ) : (
        <div className="flex h-48 w-full items-center justify-center rounded-xl bg-[#fdeaec] text-voc-red">
          <CalendarDays size={40} />
        </div>
      )}

      <div>
        <h1 className="text-xl font-semibold text-[#17171a]">{activity.title}</h1>
        <p className="mt-1 text-sm text-[#6b6b72]">{formatActivityDate(activity.starts_at)}</p>
        {activity.location && (
          <p className="mt-0.5 flex items-center gap-1 text-sm text-[#6b6b72]">
            <MapPin size={14} />
            {activity.location}
          </p>
        )}
        <p className="mt-1 flex items-center gap-1 text-sm text-[#6b6b72]">
          <Users size={14} />
          {interestCount ?? 0} aanmeldingen
        </p>
      </div>

      {activity.description && <p className="whitespace-pre-line text-sm text-[#17171a]">{activity.description}</p>}

      <div className="rounded-2xl border border-[#e5e5ea] bg-white p-4">
        {activity.allow_public_registration ? (
          <PublicRegistrationForm activityId={activity.id} />
        ) : (
          <div className="flex flex-col gap-2 text-sm text-[#17171a]">
            <p>Deze activiteit is alleen voor leden.</p>
            {/* target="_top": deze pagina draait als iframe op de VOC-website — zonder
                dit zou het inlogscherm proberen te laden binnen dat kleine iframe. */}
            <Link
              href="/login"
              target="_top"
              className="inline-block w-fit rounded-full bg-voc-red px-4 py-2 text-sm font-medium text-white hover:bg-voc-red/90"
            >
              Log in om je aan te melden
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
