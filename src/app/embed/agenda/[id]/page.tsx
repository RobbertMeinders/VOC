import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { formatActivityDate } from "@/lib/format/date";
import { getCurrentProfile } from "@/lib/auth/session";
import { EmbedAutoHeight } from "@/components/embed/EmbedAutoHeight";
import { ShareActivityButton } from "@/components/embed/ShareActivityButton";
import { RegisterButton } from "@/components/agenda/RegisterButton";
import { MemberOrVisitorRegistration } from "@/components/embed/MemberOrVisitorRegistration";
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

  // /embed staat in PUBLIC_PATHS (geen auth vereist). Deze check herkent een
  // bezoeker die toevallig in dezelfde tab al is ingelogd op het portaal
  // (bv. iemand die rechtstreeks naar deze /embed-URL navigeert). In de
  // écht ingebedde situatie (iframe op de externe WordPress-site) werkt dit
  // NIET: Supabase's sessiecookie gaat mee als SameSite=Lax, en die wordt
  // door de browser nooit meegestuurd naar een cross-site iframe — ongeacht
  // third-party-cookie-instellingen. Daarom hieronder ALTIJD ook een
  // expliciete "Al lid? Log in"-optie tonen, i.p.v. alleen op deze
  // (onbetrouwbare, in de praktijk vrijwel nooit werkende) detectie te
  // vertrouwen.
  const [imageUrl, { data: interestCount }, profile] = await Promise.all([
    getSignedStorageUrl("activity-images", activity.image_url),
    supabase.rpc("get_activity_interest_count", { p_activity_id: activity.id }),
    getCurrentProfile(),
  ]);

  const [registration, confirmedCount] = profile
    ? await Promise.all([
        supabase
          .from("activity_registrations")
          .select("is_waitlisted")
          .eq("activity_id", activity.id)
          .eq("profile_id", profile.id)
          .maybeSingle()
          .then((r) => r.data),
        supabase
          .from("activity_registrations")
          .select("id", { count: "exact", head: true })
          .eq("activity_id", activity.id)
          .eq("is_waitlisted", false)
          .then((r) => r.count ?? 0),
      ])
    : [null, 0];

  const isFull = activity.max_participants !== null && confirmedCount >= activity.max_participants;
  const deadlinePassed = activity.registration_deadline ? new Date(activity.registration_deadline) < new Date() : false;

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
          <ShareActivityButton
            activityId={activity.id}
            slug={activity.slug}
            title={activity.title}
            marketingUrl={process.env.MARKETING_AGENDA_URL}
          />
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
            // Ingelogd lid (sessie hier daadwerkelijk gedetecteerd, zie de
            // uitleg bij `profile` hierboven): meld je meteen aan via
            // dezelfde server action als het portaal zelf gebruikt (dus met
            // wachtlijst e.d.) — geen omweg via een "ga naar het portaal"-knop
            // nodig, we weten al wie je bent.
            <div className="flex flex-col gap-3 text-sm text-foreground">
              <p>
                Je bent ingelogd als <span className="font-medium">{profile.first_name}</span>.
              </p>
              <RegisterButton
                activityId={activity.id}
                initialRegistered={Boolean(registration)}
                initialWaitlisted={Boolean(registration?.is_waitlisted)}
                isFull={isFull}
                deadlinePassed={deadlinePassed}
              />
            </div>
          ) : (
            // Server-side kon geen sessie gedetecteerd worden (het normale
            // geval in een echte cross-site iframe-embed) — dit component
            // probeert het client-side alsnog via de Storage Access API,
            // met de altijd-werkende pop-up als fallback. Zie
            // MemberOrVisitorRegistration voor de volledige uitleg.
            <MemberOrVisitorRegistration
              activityId={activity.id}
              allowPublicRegistration={activity.allow_public_registration}
              loginHref={`/login?next=${encodeURIComponent(`/agenda/${activity.id}`)}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
