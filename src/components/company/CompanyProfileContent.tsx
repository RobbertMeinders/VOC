import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl, getSignedStorageUrls } from "@/lib/supabase/storage";
import { isBoard } from "@/lib/auth/roles";
import { companyHref, companyIdFilter, resolveCompanySlugAlias } from "@/lib/company/slug";
import { CompanyHeader } from "@/components/company/CompanyHeader";
import { CompanyLocationMap } from "@/components/company/CompanyLocationMap";
import { CompanyMemberList, type CompanyMember } from "@/components/company/CompanyMemberList";
import { CompanyMembershipRequests, type PendingMembershipRequest } from "@/components/company/CompanyMembershipRequests";
import { InviteColleagueForm } from "@/components/company/InviteColleagueForm";
import { CompanyMembershipSection } from "@/components/company/CompanyMembershipSection";
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
  const isPrimaryContact = (memberRows ?? []).some((row) => row.profile_id === profile.id && row.is_primary);

  const [logoUrl, avatarUrls] = await Promise.all([
    getSignedStorageUrl("company-logos", company.logo_url),
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

  return (
    <div className="flex flex-col gap-6">
      <CompanyHeader company={company} logoUrl={logoUrl} editHref={canManage ? companyHref(company, "/bewerken") : undefined} />

      {/* Direct onder de header, boven de kaart en ledenlijst — anders is
          deze actie makkelijk te missen als je hier via de notificatie
          binnenkomt en de kaart+ledenlijst het scherm al vullen. */}
      {canManage && <CompanyMembershipRequests companyId={company.id} requests={pendingRequests} />}
      {canManage && <InviteColleagueForm companyId={company.id} />}
      {canManage && (
        <CompanyMembershipSection
          companyId={company.id}
          membershipStatus={company.membership_status}
          memberSince={company.member_since}
          membershipEndDate={company.membership_end_date}
          canManage={canManage}
          isPrimaryContact={isPrimaryContact}
          isBoard={isBoard(profile.role)}
        />
      )}

      {/* UX-review V6: deze kaart liet op bijna elk bedrijf alleen "Nog geen
          leden gekoppeld aan dit bedrijf." zien — een lege sectie verbergen
          is hier duidelijker dan een kale zin tonen. */}
      {members.length > 0 && (
        <div className="rounded-2xl bg-surface p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Werkzaam bij dit bedrijf</h2>
          <CompanyMemberList members={members} />
        </div>
      )}

      {company.show_address && company.latitude !== null && company.longitude !== null && (
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
      )}
    </div>
  );
}
