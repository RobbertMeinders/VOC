import Link from "next/link";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { after } from "next/server";
import { cache } from "react";
import { CalendarDays, Clock, Download, ExternalLink, MapPin, Pencil, Users, XCircle } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAppSettings } from "@/lib/settings/app-settings";
import { getSignedStorageUrl, getSignedStorageUrls } from "@/lib/supabase/storage";
import { isBoard } from "@/lib/auth/roles";
import { formatActivityDate, formatActivityTimeOnly, formatLastActive } from "@/lib/format/date";
import { RegisterButton } from "@/components/agenda/RegisterButton";
import { AttendeeList } from "@/components/agenda/AttendeeList";
import { DeleteButton } from "@/components/feed/DeleteButton";
import { Card } from "@/components/ui/Card";
import { ActivityDetailActionsMenu } from "@/components/agenda/ActivityDetailActionsMenu";
import { ActivityAttachmentRow } from "@/components/agenda/ActivityAttachmentRow";
import { RejectActivityForm } from "@/components/agenda/RejectActivityForm";
import { ApproveActivityForm } from "@/components/agenda/ApproveActivityForm";
import { StatusPill } from "@/components/ui/StatusPill";
import { deleteActivityAction, decideActivitySubmissionAction } from "@/app/(app)/agenda/actions";
import { logEvent } from "@/lib/events/log";
import { activityHref, activityIdFilter, resolveActivitySlugAlias } from "@/lib/agenda/slug";
import { InvitationResendButton } from "@/components/beheer/InvitationResendButton";
import { QuickInviteButton } from "@/components/beheer/QuickInviteButton";
import type { Database } from "@/lib/types/database";

type Activity = Database["public"]["Tables"]["activities"]["Row"];
type Attachment = Database["public"]["Tables"]["activity_attachments"]["Row"];

// Personenmodel Fase 2: label naast een "Aangemeld via de website"-rij als
// de exacte e-mailmatch (get_public_activity_registrations, 0209) iemand
// herkent. "lid" krijgt bewust geen label-tekst (de naam zelf is al
// duidelijk genoeg; geen actie nodig).
const PERSON_STATUS_LABELS: Record<"lid" | "lid_zonder_account" | "geen_lid", string | null> = {
  lid: "· lid",
  lid_zonder_account: "· lid (geen account)",
  geen_lid: null,
};

// Performance-audit #5: generateMetadata (title) en ActivityDetailContent
// deden allebei hun eigen activities-query voor dezelfde id — cache() dedupet
// de tweede aanroep binnen hetzelfde verzoek. `param` is de route-waarde uit
// de URL (sinds de leesbare-URL's een titel-slug, of — voor oudere links —
// een kaal UUID), zie lib/agenda/slug.ts.
const getCachedActivity = cache(async (param: string): Promise<Activity | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select("*")
    .filter(...activityIdFilter(param))
    .maybeSingle<Activity>();
  return data;
});

export async function getActivityTitle(param: string): Promise<string> {
  const activity = await getCachedActivity(param);
  return activity?.title ?? "Activiteit";
}

// Gedeeld tussen de volledige pagina (/agenda/[id]) en de intercepted
// overlay (@modal/(.)agenda/[id]) — zie MemberProfileContent voor dezelfde
// reden. `id`-prop hier is dus eigenlijk de route-slug/het-UUID uit de URL;
// na het ophalen van de rij wordt overal verderop activity.id (het échte
// UUID) gebruikt, nooit deze ruwe route-waarde.
export async function ActivityDetailContent({ id: routeParam }: { id: string }) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const appSettings = await getAppSettings();

  const activity = await getCachedActivity(routeParam);
  if (!activity) {
    // URL-ronde #100: de slug van een activiteit kan wijzigen (titel- of
    // datumwijziging) — een gemiste directe match kan dus een oude,
    // inmiddels verouderde slug zijn (activity_slug_aliases, migratie
    // 0155) i.p.v. een echt onbestaande activiteit.
    const currentSlug = await resolveActivitySlugAlias(supabase, routeParam);
    if (currentSlug) {
      permanentRedirect(activityHref({ slug: currentSlug }));
    }
    notFound();
  }

  // URL-ronde #100: een kaal UUID (oude, rechtstreeks verstuurde link) blijft
  // werken, maar stuurt door naar de canonieke slug-URL — zelfde patroon als
  // bedrijven (CompanyProfileContent).
  if (routeParam !== activity.slug) {
    permanentRedirect(activityHref(activity));
  }

  // Performance-audit #3: dit blokkeerde eerder het renderen van de hele
  // pagina (100-300ms) terwijl de gebruiker niets aan de statistiekregel
  // zelf heeft — na() het antwoord loggen i.p.v. ervoor.
  after(() => logEvent("activity_viewed", "activity", activity.id));

  type RegistrationRow = {
    id: string;
    is_waitlisted: boolean;
    attended: boolean;
    profile: { id: string; slug: string; first_name: string; last_name: string; avatar_url: string | null; anonymized_at: string | null } | null;
  };
  type SubmitterRow = {
    first_name: string;
    last_name: string;
    company_members: { is_primary: boolean; company: { name: string } | null }[];
  };
  type PublicRegistrationRow = {
    id: string;
    name: string;
    email: string;
    company_name: string | null;
    created_at: string;
    person_status: "lid" | "lid_zonder_account" | "geen_lid";
    invitation_id: string | null;
  };

  // Alle onafhankelijke queries (incl. de indiener, voorheen pas hierna en
  // apart gewacht) samen in één Promise.all i.p.v. na elkaar — dat scheelt
  // een volledige netwerk-rondgang bij het openen van deze pagina/overlay.
  const [
    imageUrl,
    { data: registrations },
    { data: myRegistration },
    { data: attachments },
    { data: submitter },
    { data: publicRegistrations },
  ] = await Promise.all([
    getSignedStorageUrl("activity-images", activity.image_url),
    supabase
      .from("activity_registrations")
      .select("id, is_waitlisted, attended, profile:profiles(id, slug, first_name, last_name, avatar_url, anonymized_at)")
      .eq("activity_id", activity.id)
      .order("created_at", { ascending: true })
      .returns<RegistrationRow[]>(),
    supabase
      .from("activity_registrations")
      .select("id, is_waitlisted")
      .eq("activity_id", activity.id)
      .eq("profile_id", profile.id)
      .maybeSingle(),
    supabase
      .from("activity_attachments")
      .select("*")
      .eq("activity_id", activity.id)
      .order("created_at", { ascending: true })
      .returns<Attachment[]>(),
    activity.source === "lid" && activity.created_by
      ? supabase
          .from("profiles")
          .select("first_name, last_name, company_members(is_primary, company:companies(name))")
          .eq("id", activity.created_by)
          .maybeSingle<SubmitterRow>()
      : Promise.resolve({ data: null as SubmitterRow | null }),
    // get_public_activity_registrations (0209, personenmodel Fase 2) i.p.v.
    // rechtstreeks .from("public_activity_registrations") -- geeft er meteen
    // person_status/invitation_id bij (exacte e-mailmatch tegen profielen/
    // openstaande uitnodigingen), board-only net als de RPC zelf afdwingt;
    // niet-bestuursleden slaan deze query gewoon over.
    isBoard(profile.role) && activity.allow_public_registration
      ? supabase.rpc("get_public_activity_registrations", { p_activity_id: activity.id }).returns<PublicRegistrationRow[]>()
      : Promise.resolve({ data: null as PublicRegistrationRow[] | null }),
  ]);

  // get_activity_registration_counts (0088, uitgebreid in 0166) telt leden-
  // én externe aanmeldingen samen — dezelfde telling als agenda/zoeken en de
  // embed-statusroute gebruiken, zodat "vol"/badges overal hetzelfde getal
  // tonen i.p.v. drie losse, elk-zonder-externen tellingen.
  const { data: countRow } = await supabase
    .rpc("get_activity_registration_counts")
    .eq("activity_id", activity.id)
    .maybeSingle();
  const confirmedCount = Number(countRow?.registered_count ?? 0);

  let submitterLabel: string | null = null;
  if (submitter) {
    const membership = submitter.company_members.find((m) => m.is_primary) ?? submitter.company_members[0];
    const name = `${submitter.first_name} ${submitter.last_name}`;
    submitterLabel = membership?.company ? `${name} · ${membership.company.name}` : name;
  }

  const confirmedRegistrations = (registrations ?? []).filter((r) => !r.is_waitlisted);
  const waitlistedRegistrations = (registrations ?? []).filter((r) => r.is_waitlisted);

  // De twee signed-URL-batches zijn onafhankelijk van elkaar (bijlagen vs.
  // aanwezigen-avatars) — ook hier parallel i.p.v. na elkaar.
  const [attachmentUrls, attendeeAvatarUrls] = await Promise.all([
    getSignedStorageUrls(
      supabase,
      "activity-attachments",
      (attachments ?? []).map((a) => a.storage_path)
    ),
    getSignedStorageUrls(
      supabase,
      "avatars",
      confirmedRegistrations.map((r) => r.profile?.avatar_url ?? null)
    ),
  ]);
  const attendees = confirmedRegistrations
    .filter((r): r is RegistrationRow & { profile: NonNullable<RegistrationRow["profile"]> } => r.profile !== null)
    .map((r) => ({
      id: r.profile.id,
      slug: r.profile.slug,
      first_name: r.profile.first_name,
      last_name: r.profile.last_name,
      avatarUrl: r.profile.avatar_url ? (attendeeAvatarUrls.get(r.profile.avatar_url) ?? null) : null,
      registrationId: r.id,
      attended: r.attended,
      anonymized: Boolean(r.profile.anonymized_at),
    }));

  const isFull = activity.max_participants !== null && confirmedCount >= activity.max_participants;
  const deadlinePassed = activity.registration_deadline
    ? new Date(activity.registration_deadline) < new Date()
    : false;

  return (
    <div className="flex flex-col gap-4">
      <Card padded={false} className="overflow-hidden">
        {imageUrl && (
          // Afwerkronde blok 6: vaste 16:9-verhouding met object-position
          // top i.p.v. een losse max-h — bij een hoge/staande foto werd het
          // bovenste (vaak belangrijkste) deel er eerder middenin afgesneden.
          <div className="relative aspect-video w-full">
            <Image src={imageUrl} alt={activity.title} fill sizes="(min-width: 640px) 640px, 100vw" className="object-cover object-top" />
          </div>
        )}
        <div className="p-6">
          {/* Afwerkronde blok 6: Bewerken + het "..."-menu stonden als los
              blok onder AttendeeList/bijlagen — nu rechtsboven in deze kaart,
              naast de titel, i.p.v. ergens onderaan de pagina te "zweven". */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {(activity.source === "lid" || activity.status !== "approved") && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {activity.source === "lid" && (
                    <span className="rounded-full bg-black/[.06] px-2 py-0.5 text-xs font-medium text-muted dark:bg-white/[.08]">
                      Externe activiteit
                    </span>
                  )}
                  {activity.status === "pending" && (
                    <StatusPill tone="warning" icon={Clock}>
                      Ter goedkeuring
                    </StatusPill>
                  )}
                  {/* "Afgewezen" is geen echte fout meer (rood blijft
                      voorbehouden aan "Afgelast" en echte fouten) — neutraal
                      i.p.v. rood. */}
                  {activity.status === "rejected" && (
                    <StatusPill tone="neutral" icon={XCircle}>
                      Afgewezen
                    </StatusPill>
                  )}
                  {activity.status === "cancelled" && (
                    <StatusPill tone="danger" icon={XCircle}>
                      Afgelast
                    </StatusPill>
                  )}
                </div>
              )}
              {activity.status === "rejected" && activity.rejection_reason && (
                <p className="mb-2 rounded-lg bg-status-neutral-soft px-3 py-2 text-sm text-status-neutral">
                  {activity.rejection_reason}
                </p>
              )}
              <h1 className="font-display text-[1.5rem] font-extrabold tracking-[-0.03em] text-foreground sm:text-[1.75rem]">{activity.title}</h1>
              {submitterLabel && isBoard(profile.role) && <p className="mt-1 text-xs text-muted">Toegevoegd door {submitterLabel}</p>}
            </div>
            {isBoard(profile.role) && (
              <div className="flex shrink-0 items-center gap-1.5">
                <Link
                  href={activityHref(activity, "/bewerken")}
                  aria-label="Bewerken"
                  title="Bewerken"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground hover:bg-black/[.03] dark:hover:bg-white/[.06]"
                >
                  <Pencil size={14} />
                </Link>
                <ActivityDetailActionsMenu
                  activityId={activity.id}
                  activityTitle={activity.title}
                  activitySlug={activity.slug}
                  canCancel={activity.status !== "cancelled" && confirmedCount + waitlistedRegistrations.length > 0}
                />
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-col gap-2 text-sm text-muted">
            <span className="flex items-center gap-2">
              <CalendarDays size={16} />
              {formatActivityDate(activity.starts_at)}
              {activity.ends_at && ` - ${formatActivityTimeOnly(activity.ends_at)}`}
            </span>
            {activity.location && (
              <span className="flex items-center gap-2">
                <MapPin size={16} />
                {activity.location}
              </span>
            )}
            <span className="flex items-center gap-2">
              <Users size={16} />
              {confirmedCount} aangemeld
              {activity.max_participants ? ` (max. ${activity.max_participants})` : ""}
              {waitlistedRegistrations.length > 0 && ` · ${waitlistedRegistrations.length} op wachtlijst`}
            </span>
          </div>

          {activity.description && (
            <p className="mt-4 whitespace-pre-wrap text-sm text-foreground">{activity.description}</p>
          )}

          <div className="mt-5">
            {activity.status === "cancelled" ? (
              <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-text">
                Deze activiteit is afgelast. Aanmelden is niet meer mogelijk.
              </p>
            ) : (
              // Afwerkronde blok 6: "Zet in je agenda" was een klein grijs
              // linkje onder de aanmeldknop — nu een echte secundaire knop
              // ernaast, zelfde gewicht als Aanmelden i.p.v. bijna onzichtbaar.
              <div className="flex flex-wrap items-start gap-2">
                {activity.external_registration_url ? (
                  <a
                    href={activity.external_registration_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center gap-1.5 rounded-full bg-voc-red px-4 text-sm font-medium text-white hover:bg-voc-red-dark"
                    title="Aanmelden op de website van de organisator (opent in een nieuw tabblad)"
                  >
                    Aanmelden
                    <ExternalLink size={14} />
                  </a>
                ) : (
                  <RegisterButton
                    activityId={activity.id}
                    initialRegistered={Boolean(myRegistration)}
                    initialWaitlisted={Boolean(myRegistration?.is_waitlisted)}
                    isFull={isFull}
                    deadlinePassed={deadlinePassed}
                  />
                )}
                {/* Externe activiteiten: de échte aanmelding staat hierboven
                    (de link naar de organisator) — deze knop is er puur voor
                    andere leden, zie "Wie gaat er ook" verderop. */}
                {activity.external_registration_url && (
                  <RegisterButton
                    activityId={activity.id}
                    initialRegistered={Boolean(myRegistration)}
                    initialWaitlisted={Boolean(myRegistration?.is_waitlisted)}
                    isFull={isFull}
                    deadlinePassed={deadlinePassed}
                    externalEvent
                  />
                )}
                <a
                  href={activityHref(activity, "/ics")}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground hover:bg-black/[.03] dark:hover:bg-white/[.06]"
                >
                  <Download size={14} />
                  Zet in je agenda
                </a>
              </div>
            )}
            {activity.status !== "cancelled" && activity.external_registration_url && (
              <p className="mt-2 text-xs text-muted">Aanmelden gaat via de website van de organisator hierboven.</p>
            )}
            {activity.status !== "cancelled" && activity.registration_deadline && !deadlinePassed && (
              <p className="mt-2 text-xs text-muted">
                Aanmelden kan tot {formatActivityDate(activity.registration_deadline)}.
              </p>
            )}
            {/* H (onboarding-opdracht): aanmelden via het portaal telt nog
                niet officieel mee — alleen relevant voor een "echte" VOC-
                aanmelding, niet als er toch al via de organisator wordt
                aangemeld (die regel hierboven dekt dat geval al). */}
            {appSettings.show_testfase && activity.status !== "cancelled" && !activity.external_registration_url && (
              <p className="mt-2 text-xs text-muted">
                Proefversie: meld je ook aan via de website.
              </p>
            )}
          </div>
        </div>
      </Card>

      <AttendeeList
        attendees={attendees}
        waitlistCount={waitlistedRegistrations.length}
        activityId={activity.id}
        canManage={isBoard(profile.role)}
      />

      {publicRegistrations && publicRegistrations.length > 0 && (
        <div className="rounded-2xl bg-surface p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-foreground">
            Aangemeld via de website ({publicRegistrations.length})
          </h2>
          <p className="mb-3 text-xs text-muted">Staan ook bij Instroom &gt; Potentiële leden.</p>
          <div className="flex flex-col">
            {publicRegistrations.map((registration) => (
              <div key={registration.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 last:border-0">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium text-foreground">
                    {registration.name}
                    {PERSON_STATUS_LABELS[registration.person_status] && (
                      <span className="ml-2 text-xs font-normal text-muted">{PERSON_STATUS_LABELS[registration.person_status]}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    {registration.email}
                    {registration.company_name && ` · ${registration.company_name}`} · aangemeld{" "}
                    {formatLastActive(registration.created_at).toLowerCase()}
                  </p>
                </div>
                {/* Personenmodel Fase 2: per-rij actie op basis van de
                    exacte e-mailmatch -- een echte lid-match heeft hier
                    niets te doen, de andere twee krijgen precies één
                    vervolgstap. */}
                {registration.person_status === "lid_zonder_account" && registration.invitation_id && (
                  <InvitationResendButton invitationId={registration.invitation_id} />
                )}
                {registration.person_status === "geen_lid" && <QuickInviteButton name={registration.name} email={registration.email} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {(attachments ?? []).length > 0 && (
        <div className="rounded-2xl bg-surface p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Bijlagen</h2>
          <div className="flex flex-col gap-2">
            {(attachments ?? []).map((attachment) => (
              <ActivityAttachmentRow
                key={attachment.id}
                attachment={attachment}
                url={attachmentUrls.get(attachment.storage_path) ?? null}
                canManage={false}
              />
            ))}
          </div>
        </div>
      )}

      {isBoard(profile.role) && activity.status === "pending" && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface p-4 shadow-sm">
          <p className="mr-auto text-sm text-muted">Deze activiteit wacht nog op een besluit.</p>
          <ApproveActivityForm
            onApprove={async (notifyPush, notifyEmail) => {
              "use server";
              await decideActivitySubmissionAction(activity.id, "approved", undefined, notifyPush, notifyEmail);
            }}
          />
          <RejectActivityForm
            onReject={async (reason) => {
              "use server";
              await decideActivitySubmissionAction(activity.id, "rejected", reason);
            }}
          />
        </div>
      )}

      {!isBoard(profile.role) && activity.created_by === profile.id && activity.status === "pending" && (
        <DeleteButton
          onDelete={deleteActivityAction.bind(null, activity.id)}
          confirmMessage="Weet je zeker dat je deze inzending wilt intrekken?"
          className="flex items-center gap-1.5 self-start rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-voc-red-text hover:border-muted"
        />
      )}
    </div>
  );
}
