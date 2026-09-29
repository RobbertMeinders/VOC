import type { Metadata } from "next";
import Link from "next/link";
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
export default async function AgendaEmbedPage() {
  const supabase = await createClient();

  const { data: activities } = await supabase
    .from("activities")
    .select("*")
    .eq("status", "approved")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .returns<Activity[]>();

  const [imageUrls, counts] = await Promise.all([
    getSignedStorageUrls(
      supabase,
      "activity-images",
      (activities ?? []).map((a) => a.image_url)
    ),
    Promise.all(
      (activities ?? []).map(async (a) => {
        const { data } = await supabase.rpc("get_activity_interest_count", { p_activity_id: a.id });
        return [a.id, data ?? 0] as const;
      })
    ).then((entries) => new Map(entries)),
  ]);

  return (
    <div className="flex flex-col gap-3 bg-white p-4">
      <EmbedAutoHeight />
      {/* Deze titel + intro staan hier i.p.v. los op de WordPress-pagina
          zelf, juist zodat ze ALLEEN op dit overzicht staan — klik je door
          naar een activiteit, dan verandert alleen de inhoud van de iframe
          (deze tekst hoort daar niet meer thuis) i.p.v. dat 'm op de
          WordPress-pagina blijft hangen omdat die buiten de iframe valt. */}
      <div>
        <h2 className="text-xl font-semibold text-[#17171a]">De activiteiten</h2>
        <p className="mt-2 text-sm text-[#6b6b72]">
          De Veendammer OndernemersCompagnie organiseert het hele jaar door activiteiten voor en door ondernemers in
          Veendam en omgeving. Van informele borrels en kennissessies tot bedrijfsbezoeken en een groot
          eindejaarsfeest, er is voor ieder wat wils.
        </p>
        <p className="mt-2 text-sm text-[#6b6b72]">
          Alle activiteiten zijn bedoeld om ondernemers samen te brengen, kennis te delen en het netwerk in de regio
          te versterken. Aanmelden is verplicht in verband met de organisatie.
        </p>
      </div>
      {(activities ?? []).length === 0 && (
        <p className="py-8 text-center text-sm text-[#6b6b72]">Er zijn momenteel geen activiteiten gepland.</p>
      )}
      {(activities ?? []).map((activity) => {
        const imageUrl = activity.image_url ? (imageUrls.get(activity.image_url) ?? null) : null;
        return (
          <Link
            key={activity.id}
            href={`/embed/agenda/${activity.id}`}
            className="flex gap-3 rounded-xl border border-[#e5e5ea] bg-white p-3 shadow-sm hover:border-voc-red/40"
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- a public, external-embed page: keep it framework-agnostic and dependency-free
              <img src={imageUrl} alt={activity.title} className="h-28 w-28 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-lg bg-[#fdeaec] text-voc-red">
                <CalendarDays size={24} />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#17171a]">{activity.title}</p>
              <p className="mt-0.5 text-xs text-[#6b6b72]">{formatActivityDate(activity.starts_at)}</p>
              {activity.location && (
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-[#6b6b72]">
                  <MapPin size={12} />
                  {activity.location}
                </p>
              )}
              {activity.description && (
                <p className="mt-1 line-clamp-2 text-xs text-[#6b6b72]">{activity.description}</p>
              )}
              <p className="mt-1 flex items-center gap-1 text-xs text-[#6b6b72]">
                <Users size={12} />
                {counts.get(activity.id) ?? 0} aanmeldingen
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
