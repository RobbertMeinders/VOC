import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Clock, Mail, Phone } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { formatLastActive } from "@/lib/format/date";
import { Avatar } from "@/components/ui/Avatar";
import { ExpandableText } from "@/components/ui/ExpandableText";
import { EntitySocialLinks } from "@/components/ui/EntitySocialLinks";
import { ProfileHero, type HeroPill } from "@/components/ui/ProfileLayout";
import { CompanyLogo } from "@/components/company/CompanyLogo";
import { MemberPostList } from "@/components/members/MemberPostList";
import { AttendedActivitiesSection } from "@/components/members/AttendedActivitiesSection";
import { isAdmin, isBoard } from "@/lib/auth/roles";
import { RoleEditor } from "@/components/members/RoleEditor";
import { AdminEditProfile } from "@/components/members/AdminEditProfile";
import { MemberActiveToggle } from "@/components/members/MemberActiveToggle";
import { GenerateLoginLinkButton } from "@/components/members/GenerateLoginLinkButton";
import { ForceLogoutButton } from "@/components/members/ForceLogoutButton";
import { ContactMemberButton } from "@/components/members/ContactMemberButton";
import { fetchFeedPostsByAuthor } from "@/lib/feed/queries";
import { MEMBER_PROFILE_LIST_PREVIEW } from "@/lib/feed/pagination";
import { companyHref } from "@/lib/company/slug";
import type { Database } from "@/lib/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Membership = {
  company: {
    id: string;
    slug: string;
    name: string;
    city: string | null;
    industry: string | null;
    logo_url: string | null;
  } | null;
};
type AttendedActivity = { id: string; title: string; starts_at: string; slug: string };

// Performance-audit #5: generateMetadata (title) en MemberProfileContent
// riepen allebei hun eigen profiel-query aan voor dezelfde route-waarde —
// met React's cache() wordt de tweede aanroep binnen hetzelfde verzoek
// hergebruikt i.p.v. een dubbele round-trip naar Supabase te doen (zelfde
// patroon als getCurrentProfile in lib/auth/session.ts). `param` is de
// route-waarde uit de URL (sinds de leesbare-URL's een naam-slug, of —
// voor oudere links — een kaal UUID): get_member_profile matcht nu op
// allebei (zie migratie 0122_profile_slug.sql).
const getCachedMemberProfile = cache(async (param: string): Promise<Profile | null> => {
  const supabase = await createClient();
  // get_member_profile (0061_masked_contact_fields.sql) i.p.v. rechtstreeks
  // .from("profiles") — maskeert email/phone naar null tenzij het je eigen
  // profiel is, de bekeken persoon dat zelf zichtbaar heeft gezet
  // (show_email/show_phone), of jijzelf bestuur/beheer bent.
  const { data } = await supabase.rpc("get_member_profile", { p_id: param }).returns<Profile[]>();
  return data?.[0] ?? null;
});

export async function getMemberProfileTitle(param: string): Promise<string> {
  const member = await getCachedMemberProfile(param);
  return member ? `${member.first_name} ${member.last_name}` : "Lid";
}

// Gedeeld tussen de volledige pagina (/leden/[id]) en de intercepted overlay
// (@modal/(.)leden/[id]) — zelfde content, alleen de buitenste wrapper
// (max-breedte, wel/niet gecentreerd) verschilt per aanroeper. `id`-prop
// hier is dus eigenlijk de route-slug/het-UUID uit de URL; na het ophalen
// van de rij wordt overal verderop member.id (het échte UUID) gebruikt,
// nooit deze ruwe route-waarde — zelfde patroon als ActivityDetailContent.
export async function MemberProfileContent({ id: routeParam }: { id: string }) {
  const viewer = await requireProfile();
  const supabase = await createClient();

  const member = await getCachedMemberProfile(routeParam);
  if (!member) {
    notFound();
  }

  const isOwnProfile = viewer.id === member.id;
  const canSeePrivate = isOwnProfile || isBoard(viewer.role);
  const id = member.id;

  const [{ data: membership }, { data: attendedRows }, posts] = await Promise.all([
    supabase
      .from("company_members")
      .select("company:companies(id, slug, name, city, industry, logo_url)")
      .eq("profile_id", id)
      .limit(1)
      .maybeSingle()
      .returns<Membership>(),
    supabase
      .from("activity_registrations")
      .select("activity:activities(id, title, starts_at, slug)")
      .eq("profile_id", id)
      .eq("attended", true)
      .order("created_at", { ascending: false })
      .range(0, MEMBER_PROFILE_LIST_PREVIEW)
      .returns<{ activity: AttendedActivity | null }[]>(),
    // Berichten alleen op het eigen profiel tonen (niet bij andermans) — geen
    // zin om ze dan ook op te halen.
    isOwnProfile ? fetchFeedPostsByAuthor(supabase, viewer.id, id, MEMBER_PROFILE_LIST_PREVIEW + 1) : Promise.resolve([]),
  ]);

  // Deze twee hangen wél van elkaars resultaat (member.avatar_url) of van
  // membership af, dus die blijven na de Promise.all hierboven — maar wel
  // weer samen parallel i.p.v. na elkaar.
  const [avatarUrl, coverUrl, logoUrl] = await Promise.all([
    getSignedStorageUrl("avatars", member.avatar_url),
    getSignedStorageUrl("profile-covers", member.cover_url),
    membership?.company?.logo_url ? getSignedStorageUrl("company-logos", membership.company.logo_url) : null,
  ]);

  // Instelling (zie /instellingen): een lid kan deze sectie voor andere
  // leden verbergen — zichzelf en bestuur/beheer zien 'm altijd.
  const canSeeAttended = member.show_attended_activities || canSeePrivate;
  const attendedActivities = canSeeAttended
    ? (attendedRows ?? [])
        .map((r) => r.activity)
        .filter((a): a is AttendedActivity => a !== null)
        .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
    : [];

  // Profielhero-herontwerp: de hero-knop is alleen "Profiel aanpassen" op je
  // eigen profiel — op andermans profiel vervalt die en is de
  // ContactMemberButton in de Contact-kaart het alternatief (geen dubbele
  // knop meer). "Lid sinds" bestaat niet als los profielveld (dat is een
  // bedrijfsbegrip, zie companies.member_since) — de pillenrij gebruikt
  // daarom alleen wat het profiel/de koppeling echt heeft: het bedrijf waar
  // iemand werkt, de plaats van dat bedrijf, en een "Gedeactiveerd"-pil i.p.v.
  // de losse badge die hier eerder stond.
  const pills: HeroPill[] = [];
  if (membership?.company) pills.push({ label: membership.company.name, tone: "petrol" });
  if (membership?.company?.city) pills.push({ label: membership.company.city });
  if (!member.is_active) pills.push({ label: "Gedeactiveerd", tone: "danger" });

  // Hero-fix (lege-kolom-bug): op andermans profiel zonder bio (berichten
  // tonen we daar sowieso nooit) is de hoofdkolom anders leeg, met een
  // eenzame Contact-kaart ver rechts. "Bijgewoonde activiteiten" staat nu in
  // de zijbalk (zie sidebar) en telt dus niet meer mee voor de hoofdkolom.
  const hasMain = Boolean(member.bio) || (isOwnProfile && posts.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <ProfileHero
        name={`${member.first_name} ${member.last_name}`}
        subtitle={member.job_title}
        coverUrl={coverUrl}
        editHref={isOwnProfile ? "/profiel" : undefined}
        editLabel="Profiel aanpassen"
        pills={pills}
        avatar={
          <Avatar
            firstName={member.first_name}
            lastName={member.last_name}
            avatarUrl={avatarUrl}
            size={84}
            className="ring-4 ring-surface"
          />
        }
      />

      {(() => {
        // Live feedback: op mobiel (gestapeld) stonden Contact/Werkzaam bij
        // onder Berichten, terwijl die twee belangrijker zijn — op desktop
        // (twee kolommen naast elkaar) was de volgorde al prima en blijft
        // ongewijzigd. `order-*`/`lg:order-none` i.p.v. de secties fysiek
        // verplaatsen: zo blijft de brondocumentvolgorde (en dus de
        // screenreader-leesvolgorde) overal hetzelfde, enkel de visuele
        // volgorde op mobiel wijkt af. `contents` haalt de kolom-wrapper op
        // mobiel uit de boomstructuur zodat zijn kinderen rechtstreeks
        // grid-items worden van de buitenste (dan 1-koloms) grid en dus
        // tussen de andere kolom se secties door kunnen schuiven; vanaf lg
        // wordt de wrapper weer een eigen flex-kolom, zoals hiervoor.
        const aboutSection = member.bio && (
          <div className="order-1 rounded-2xl bg-surface p-6 shadow-sm lg:order-none">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Over {member.first_name}</h2>
            <ExpandableText text={member.bio} lines={5} expandLabel="Meer weergeven" collapseLabel="Minder weergeven" />
          </div>
        );

        const postsSection = isOwnProfile && posts.length > 0 && (
          <div className="order-5 rounded-2xl bg-surface p-6 shadow-sm lg:order-none">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Berichten</h2>
            <MemberPostList
              memberId={id}
              initialPosts={posts}
              currentUserId={viewer.id}
              canModerate={isBoard(viewer.role)}
              canEditOthers={isAdmin(viewer.role)}
            />
          </div>
        );

        const contactSection = (
          <div className="order-2 rounded-2xl bg-surface p-6 shadow-sm lg:order-none">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Contact</h2>
            <div className="flex flex-col gap-1 -mx-3">
              {member.show_email || canSeePrivate ? (
                <a
                  href={`mailto:${member.email}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                >
                  <Mail size={16} className="text-muted" />
                  {member.email}
                </a>
              ) : (
                <p className="flex items-center gap-3 px-3 py-2 text-sm text-muted">
                  <Mail size={16} />
                  E-mailadres is verborgen
                </p>
              )}
              {member.phone && (member.show_phone || canSeePrivate) && (
                <a
                  href={`tel:${member.phone}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                >
                  <Phone size={16} className="text-muted" />
                  {member.phone}
                </a>
              )}
              {member.linkedin_url && <div className="my-1 border-t border-border" />}
              <EntitySocialLinks linkedinUrl={member.linkedin_url} />
            </div>
            {/* VOC Hub — Veilige e-mailcontactfunctie: alleen op andermans
                profiel, en alleen als dat lid nog bereikbaar is. Dit is nu
                ook het alternatief voor de hero-knop (die hier vervalt). */}
            {!isOwnProfile && member.is_active && (
              <div className="mt-2">
                <ContactMemberButton recipientId={member.id} recipientName={`${member.first_name} ${member.last_name}`} />
              </div>
            )}
          </div>
        );

        const companySection = membership?.company && (
          <div className="order-3 rounded-2xl bg-surface p-6 shadow-sm lg:order-none">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Werkzaam bij</h2>
            <Link
              href={companyHref(membership.company)}
              className="flex items-center gap-3 rounded-xl border border-border p-3 hover:border-muted"
            >
              <CompanyLogo logoUrl={logoUrl} name={membership.company.name} size={44} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{membership.company.name}</p>
                <p className="truncate text-xs text-muted">
                  {membership.company.industry && <span>{membership.company.industry}</span>}
                  {membership.company.industry && membership.company.city && <span> · </span>}
                  {membership.company.city && <span>{membership.company.city}</span>}
                </p>
              </div>
            </Link>
          </div>
        );

        const attendedSection = attendedActivities.length > 0 && (
          <div className="order-4 rounded-2xl bg-surface p-6 shadow-sm lg:order-none">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Bijgewoonde activiteiten</h2>
            <AttendedActivitiesSection memberId={id} activities={attendedActivities} />
          </div>
        );

        if (!hasMain) {
          return (
            <div className="flex flex-col gap-4">
              {contactSection}
              {companySection}
              {attendedSection}
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
            <div className="contents lg:flex lg:flex-col lg:gap-4">
              {aboutSection}
              {postsSection}
            </div>
            <div className="contents lg:flex lg:flex-col lg:gap-4">
              {contactSection}
              {companySection}
              {attendedSection}
            </div>
          </div>
        );
      })()}

      {isBoard(viewer.role) && (
        <div className="rounded-2xl bg-surface p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Beheer</h2>
          <p className="mb-3 flex items-center gap-1.5 text-xs text-muted">
            <Clock size={12} />
            Laatst actief: {formatLastActive(member.last_active_at)}
          </p>
          <div className="flex flex-col gap-3">
            {isAdmin(viewer.role) && <RoleEditor memberId={member.id} currentRole={member.role} />}
            <AdminEditProfile member={member} avatarUrl={avatarUrl} coverUrl={coverUrl} />
            {member.id !== viewer.id && <MemberActiveToggle memberId={member.id} initialActive={member.is_active} />}
            {member.id !== viewer.id && member.is_active && <GenerateLoginLinkButton memberId={member.id} />}
            {member.id !== viewer.id && (
              <ForceLogoutButton memberId={member.id} memberName={`${member.first_name} ${member.last_name}`} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
