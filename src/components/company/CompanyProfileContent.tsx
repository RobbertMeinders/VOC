import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { Globe, Mail, MapPin, Phone } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl, getSignedStorageUrls } from "@/lib/supabase/storage";
import { isBoard } from "@/lib/auth/roles";
import { companyHref, companyIdFilter, resolveCompanySlugAlias } from "@/lib/company/slug";
import { CompanyLogo } from "@/components/company/CompanyLogo";
import { CompanyLocationMap } from "@/components/company/CompanyLocationMap";
import { CompanyMemberList, type CompanyMember } from "@/components/company/CompanyMemberList";
import { CompanyMembershipRequests, type PendingMembershipRequest } from "@/components/company/CompanyMembershipRequests";
import { InviteColleagueForm } from "@/components/company/InviteColleagueForm";
import { AddressVisibilityPrompt } from "@/components/company/AddressVisibilityPrompt";
import { EntitySocialLinks } from "@/components/ui/EntitySocialLinks";
import { ExpandableText } from "@/components/ui/ExpandableText";
import { ProfileColumns, ProfileHero, type HeroPill } from "@/components/ui/ProfileLayout";
import { StatusPill, type StatusTone } from "@/components/ui/StatusPill";
import type { Database } from "@/lib/types/database";

type Company = Database["public"]["Tables"]["companies"]["Row"];
type MemberRow = {
  profile_id: string;
  is_primary: boolean;
  profile: {
    id: string;
    slug: string;
    first_name: string;
    last_name: string;
    job_title: string | null;
    avatar_url: string | null;
    is_active: boolean;
  };
};
type RequestRow = {
  id: string;
  profile: { id: string; first_name: string; last_name: string; avatar_url: string | null };
};

// Performance-audit #5: generateMetadata (title) en CompanyProfileContent
// deden allebei hun eigen companies-query voor dezelfde id — cache() dedupet
// de tweede aanroep binnen hetzelfde verzoek (zelfde patroon als
// getCurrentProfile in lib/auth/session.ts).
// `param` is de route-waarde uit de URL: sinds de URL-ronde een leesbare
// naam-slug, of — voor oudere links — een kaal UUID (zie lib/company/slug.ts).
const getCachedCompany = cache(async (param: string): Promise<Company | null> => {
  const supabase = await createClient();
  // companies_for_members (M8, sinds 0158 een security definer functie
  // i.p.v. view — Supabase-linter 0010): maskeert address/postal_code/
  // latitude/longitude voor wie geen lid van dit bedrijf of bestuur/beheer
  // is, als het bedrijf show_address uit heeft staan. Een stable functie die
  // setof teruggeeft ondersteunt dezelfde .select()/.filter() als een view.
  const { data } = await supabase
    .rpc("companies_for_members")
    .select("*")
    .filter(...companyIdFilter(param))
    .maybeSingle<Company>();
  return data;
});

export async function getCompanyProfileTitle(param: string): Promise<string> {
  const company = await getCachedCompany(param);
  return company?.name ?? "Bedrijf";
}

// Gedeeld tussen de volledige pagina (/bedrijven/[id]) en de intercepted
// overlay (@modal/(.)bedrijven/[id]) — zie MemberProfileContent voor
// dezelfde reden. `id`-prop hier is dus eigenlijk de route-slug/het-UUID uit
// de URL; na het ophalen van de rij wordt overal verderop company.id (het
// échte UUID) gebruikt, nooit deze ruwe route-waarde.
export async function CompanyProfileContent({ id: routeParam }: { id: string }) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const company = await getCachedCompany(routeParam);
  if (!company) {
    // Opschoonbackfill (0163) kan deze route-waarde als oude, lelijke slug
    // hebben achtergelaten (company_slug_aliases) — bv. een al extern
    // gedeelde "capture-a61926fa"-link. Dan alsnog naar de huidige,
    // nette slug-URL doorsturen i.p.v. een loze notFound().
    const currentSlug = await resolveCompanySlugAlias(supabase, routeParam);
    if (currentSlug) {
      permanentRedirect(companyHref({ slug: currentSlug }));
    }
    notFound();
  }

  // URL-ronde: oude, rechtstreeks verstuurde links (kaal UUID) blijven
  // werken, maar sturen door naar de canonieke slug-URL — zodat de
  // adresbalk altijd de nette versie toont en nieuwe links die hiervandaan
  // worden gekopieerd ook meteen de slug gebruiken.
  if (routeParam !== company.slug) {
    permanentRedirect(companyHref(company));
  }

  const [{ data: memberRows }, { data: requestRows }] = await Promise.all([
    supabase
      .from("company_members")
      .select("profile_id, is_primary, profile:profiles(id, slug, first_name, last_name, job_title, avatar_url, is_active)")
      .eq("company_id", company.id)
      .returns<MemberRow[]>(),
    // Foutenrapport §0: company_membership_requests heeft twee foreign keys
    // naar profiles (profile_id én decided_by) — zonder expliciete hint
    // weigert PostgREST deze embed stilzwijgend (PGRST201), waardoor
    // openstaande koppelverzoeken hier nooit zichtbaar werden.
    supabase
      .from("company_membership_requests")
      .select("id, profile:profiles!company_membership_requests_profile_id_fkey(id, first_name, last_name, avatar_url)")
      .eq("company_id", company.id)
      .eq("status", "pending")
      .returns<RequestRow[]>(),
  ]);

  // Een gedeactiveerd lid blijft in company_members staan (90 dagen
  // bewaartermijn), maar hoort niet meer als huidig teamlid getoond te
  // worden — profiles_members_select (RLS) filtert hier niet op, dus dat
  // doen we hier.
  const activeMemberRows = (memberRows ?? []).filter((row) => row.profile.is_active);

  // Ook gebruikt voor de "Bewerken"-link in de header: bestuur/beheer of
  // een lid van dit bedrijf mag zowel aanvragen afhandelen als de
  // bedrijfs-/factuurgegevens bewerken (companies_member_update, RLS).
  const canManage = isBoard(profile.role) || activeMemberRows.some((row) => row.profile.id === profile.id);

  const [logoUrl, coverUrl, avatarUrls] = await Promise.all([
    getSignedStorageUrl("company-logos", company.logo_url),
    getSignedStorageUrl("company-covers", company.cover_url),
    getSignedStorageUrls(
      supabase,
      "avatars",
      [...activeMemberRows, ...(requestRows ?? [])].map((row) => row.profile.avatar_url)
    ),
  ]);

  const members: CompanyMember[] = activeMemberRows.map((row) => ({
    id: row.profile.id,
    slug: row.profile.slug,
    first_name: row.profile.first_name,
    last_name: row.profile.last_name,
    job_title: row.profile.job_title,
    avatarUrl: row.profile.avatar_url ? (avatarUrls.get(row.profile.avatar_url) ?? null) : null,
  }));

  const pendingRequests: PendingMembershipRequest[] = canManage
    ? (requestRows ?? []).map((row) => ({
        id: row.id,
        profile: {
          id: row.profile.id,
          first_name: row.profile.first_name,
          last_name: row.profile.last_name,
          avatarUrl: row.profile.avatar_url ? (avatarUrls.get(row.profile.avatar_url) ?? null) : null,
        },
      }))
    : [];

  // Profielhero-herontwerp: industrie komt alleen als losse pil als 'ie niet
  // al als subtitel getoond wordt (tagline heeft daar voorrang) — anders
  // dubbelop.
  const subtitle = company.tagline || company.industry;
  const pills: HeroPill[] = [];
  if (company.membership_status === "lid" && company.member_since) {
    pills.push({ label: `Lid sinds ${new Date(company.member_since).getFullYear()}`, tone: "petrol" });
  } else if (company.membership_status === "prospect") {
    pills.push({ label: "Prospect", tone: "petrol" });
  }
  if (company.city) pills.push({ label: company.city });
  if (company.tagline && company.industry) pills.push({ label: company.industry });

  const hasContact = company.phone || company.email || company.website || company.linkedin_url || company.instagram_url || company.facebook_url;
  const hasLocation = company.show_address && company.address;
  // Hero-fix (lege-kolom-bug): canManage telt mee omdat die altijd het
  // koppelverzoeken-/uitnodigen-blok toont (ook als er 0 openstaande
  // koppelverzoeken zijn) — een bedrijf zonder omschrijving/teamleden dat
  // niemand hier mag beheren, heeft anders een lege hoofdkolom.
  const hasMain = Boolean(company.description) || canManage || members.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <ProfileHero
        name={company.name}
        subtitle={subtitle}
        coverUrl={coverUrl}
        editHref={canManage ? companyHref(company, "/bewerken") : undefined}
        pills={pills}
        avatar={
          <div className="overflow-hidden rounded-xl ring-4 ring-surface">
            <CompanyLogo logoUrl={logoUrl} name={company.name} size={64} />
          </div>
        }
      />

      <ProfileColumns
        hasMain={hasMain}
        main={
          <>
            {company.description && (
              <div className="rounded-2xl bg-surface p-6 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-foreground">Over het bedrijf</h2>
                <ExpandableText
                  text={company.description}
                  lines={5}
                  expandLabel="Meer weergeven"
                  collapseLabel="Minder weergeven"
                />
              </div>
            )}

            {/* Direct onder de intro, boven de ledenlijst — anders is deze
                actie makkelijk te missen als je hier via de notificatie
                binnenkomt en de ledenlijst het scherm al vult. */}
            {canManage && <CompanyMembershipRequests companyId={company.id} requests={pendingRequests} />}
            {canManage && <InviteColleagueForm companyId={company.id} memberCount={activeMemberRows.length} />}

            {/* UX-review V6: deze kaart liet op bijna elk bedrijf alleen "Nog
                geen leden gekoppeld aan dit bedrijf." zien — een lege sectie
                verbergen is hier duidelijker dan een kale zin tonen. */}
            {members.length > 0 && (
              <div className="rounded-2xl bg-surface p-6 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-foreground">Werkzaam bij dit bedrijf</h2>
                <CompanyMemberList members={members} />
              </div>
            )}
          </>
        }
        sidebar={
          <>
            {/* Lidmaatschap-traject Deel 3: privacy ging standaard op
                "verborgen" (0180_privacy_defaults_hidden.sql) — alleen tonen
                zolang het adres nog verborgen staat EN nog niet weggeklikt. */}
            {canManage && !company.show_address && !company.address_visibility_prompt_dismissed_at && (
              <AddressVisibilityPrompt companyId={company.id} companySlug={company.slug} address={company.address} />
            )}

            {hasContact && (
              <div className="rounded-2xl bg-surface p-6 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-foreground">Contact</h2>
                <div className="flex flex-col gap-1.5 text-sm text-muted">
                  {company.phone && (
                    <a href={`tel:${company.phone}`} className="flex items-center gap-2 hover:text-petrol">
                      <Phone size={14} className="shrink-0" />
                      {company.phone}
                    </a>
                  )}
                  {company.email && (
                    <a href={`mailto:${company.email}`} className="flex items-center gap-2 hover:text-petrol">
                      <Mail size={14} className="shrink-0" />
                      {company.email}
                    </a>
                  )}
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 break-all hover:text-petrol"
                    >
                      <Globe size={14} className="shrink-0" />
                      {company.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                  {(company.linkedin_url || company.instagram_url || company.facebook_url) &&
                    (company.phone || company.email || company.website) && (
                      <div className="my-1 border-t border-border" />
                    )}
                  <EntitySocialLinks
                    variant="compact"
                    linkedinUrl={company.linkedin_url}
                    instagramUrl={company.instagram_url}
                    facebookUrl={company.facebook_url}
                  />
                </div>
              </div>
            )}

            {hasLocation && (
              <div className="rounded-2xl bg-surface p-6 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-foreground">Locatie</h2>
                {company.latitude !== null && company.longitude !== null && (
                  <div className="mb-3 overflow-hidden rounded-xl">
                    <CompanyLocationMap
                      company={{
                        id: company.id,
                        slug: company.slug,
                        name: company.name,
                        industry: company.industry,
                        city: company.city,
                        tagline: company.tagline,
                        logoUrl,
                        latitude: company.latitude,
                        longitude: company.longitude,
                      }}
                    />
                  </div>
                )}
                <p className="flex items-start gap-2 text-sm text-muted">
                  <MapPin size={14} className="mt-0.5 shrink-0" />
                  <span>
                    {company.address}
                    {company.postal_code && `, ${company.postal_code}`}
                    {company.city && ` ${company.city}`}
                  </span>
                </p>
              </div>
            )}

            <div className="rounded-2xl bg-surface p-6 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Lidmaatschap</h2>
              <div className="flex items-center gap-2 text-sm">
                <StatusPill tone={MEMBERSHIP_STATUS_TONE[company.membership_status]}>
                  {MEMBERSHIP_STATUS_LABEL[company.membership_status]}
                </StatusPill>
                {company.member_since && (
                  <span className="text-xs text-muted">sinds {new Date(company.member_since).getFullYear()}</span>
                )}
              </div>
              {canManage && (
                <p className="mt-2 text-xs text-muted">
                  Lid sinds, opzeggen en de coverfoto beheer je via{" "}
                  <Link href={companyHref(company, "/bewerken")} className="text-petrol hover:underline">
                    Bewerken
                  </Link>
                  .
                </p>
              )}
            </div>
          </>
        }
      />
    </div>
  );
}

const MEMBERSHIP_STATUS_LABEL: Record<Company["membership_status"], string> = {
  prospect: "Prospect",
  lid: "Lid",
  opgezegd: "Opgezegd",
  "oud-lid": "Oud-lid",
};

const MEMBERSHIP_STATUS_TONE: Record<Company["membership_status"], StatusTone> = {
  prospect: "neutral",
  lid: "success",
  opgezegd: "warning",
  "oud-lid": "neutral",
};
