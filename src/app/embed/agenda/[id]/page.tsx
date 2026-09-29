import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { formatActivityDate } from "@/lib/format/date";
import { getCurrentProfile } from "@/lib/auth/session";
import { PublicRegistrationForm } from "@/components/embed/PublicRegistrationForm";
import { EmbedAutoHeight } from "@/components/embed/EmbedAutoHeight";
import { ShareActivityButton } from "@/components/embed/ShareActivityButton";
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

  const isPast = new Date(activity.starts_at) < new Date();

  // /embed staat in PUBLIC_PATHS (geen auth vereist), maar een bezoeker die
  // al is ingelogd op het portaal (zelfde browser, cookies niet
  // third-party-geblokkeerd) IS hier gewoon herkenbaar. Zonder deze check
  // zag zo iemand niets bruikbaars: bij allow_public_registration alleen
  // het anonieme formulier (dat langs de echte, aan hun profiel gekoppelde
  // aanmelding/wachtlijst heen gaat), en anders alleen een inlogknop terwijl
  // ze al waren ingelogd.
  const [imageUrl, { data: interestCount }, profile] = await Promise.all([
    getSignedStorageUrl("activity-images", activity.image_url),
    supabase.rpc("get_activity_interest_count", { p_activity_id: activity.id }),
    getCurrentProfile(),
  ]);

  const registration = profile
    ? (
        await supabase
          .from("activity_registrations")
          .select("is_waitlisted")
          .eq("activity_id", activity.id)
          .eq("profile_id", profile.id)
          .maybeSingle()
      ).data
    : null;

  return (
    // Zie /embed/agenda/page.tsx voor waarom data-theme="light" + min-h-screen
    // hier samen nodig zijn (voorkomt de donkere balk die <body> anders
    // onderin liet doorschemeren bij een donker OS-thema).
    <div data-theme="light" className="min-h-screen bg-background">
      <div className="flex flex-col gap-4 p-4">
        <EmbedAutoHeight />
        <div className="flex items-center justify-between gap-3">
          <Link href="/embed/agenda" className="flex w-fit items-center gap-1.5 text-sm font-medium text-voc-red hover:underline">
            <ArrowLeft size={16} />
            Terug naar agenda
          </Link>
          <ShareActivityButton activityId={activity.id} title={activity.title} marketingUrl={process.env.MARKETING_AGENDA_URL} />
        </div>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- publieke, external-embed pagina: geen framework-afhankelijkheden
          <img src={imageUrl} alt={activity.title} className="h-80 w-full rounded-xl object-cover" />
        ) : (
          <div className="flex h-80 w-full items-center justify-center rounded-xl bg-voc-red-light text-voc-red">
            <CalendarDays size={40} />
          </div>
        )}

        <div>
          <h1 className="text-xl font-semibold text-foreground">{activity.title}</h1>
          <p className="mt-1 text-sm text-muted">{formatActivityDate(activity.starts_at)}</p>
          {activity.location && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
              <MapPin size={14} />
              {activity.location}
            </p>
          )}
          <p className="mt-1 flex items-center gap-1 text-sm text-muted">
            <Users size={14} />
            {interestCount ?? 0} aanmeldingen
          </p>
        </div>

        {activity.description && <p className="whitespace-pre-line text-sm text-foreground">{activity.description}</p>}

        <div className="mx-auto mt-2 w-full max-w-md rounded-2xl bg-surface p-5 shadow-sm">
          {isPast ? (
            <p className="text-sm text-muted">Deze activiteit heeft al plaatsgevonden.</p>
          ) : profile ? (
            // Ingelogd lid: altijd doorsturen naar de echte activiteitpagina in
            // het portaal (target="_top", breekt uit de iframe) — die heeft de
            // volledige aanmeld-/wachtlijstlogica al, dit embed-formulier is
            // alleen voor anonieme niet-leden.
            <div className="flex flex-col gap-2 text-sm text-foreground">
              {registration ? (
                <p>{registration.is_waitlisted ? "Je staat op de wachtlijst voor deze activiteit." : "Je bent aangemeld voor deze activiteit."}</p>
              ) : (
                <p>Je bent ingelogd als lid. Meld je aan via het portaal.</p>
              )}
              <Link
                href={`/agenda/${activity.id}`}
                target="_top"
                className="inline-block w-fit rounded-full bg-voc-red px-4 py-2 text-sm font-medium text-white hover:bg-voc-red/90"
              >
                {registration ? "Bekijk in het portaal" : "Aanmelden via het portaal"}
              </Link>
            </div>
          ) : activity.allow_public_registration ? (
            <PublicRegistrationForm activityId={activity.id} />
          ) : (
            <div className="flex flex-col gap-2 text-sm text-foreground">
              <p>Deze activiteit is alleen voor leden.</p>
              {/* target="_top": deze pagina draait als iframe op de VOC-website — zonder
                  dit zou het inlogscherm proberen te laden binnen dat kleine iframe.
                  ?next=/agenda/[id]: stuurt na inloggen door naar de activiteit zelf
                  in het portaal, i.p.v. naar het dashboard. */}
              <Link
                href={`/login?next=${encodeURIComponent(`/agenda/${activity.id}`)}`}
                target="_top"
                className="inline-block w-fit rounded-full bg-voc-red px-4 py-2 text-sm font-medium text-white hover:bg-voc-red/90"
              >
                Log in om je aan te melden
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
