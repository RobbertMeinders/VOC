import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl, getSignedStorageUrls } from "@/lib/supabase/storage";
import { isBoard } from "@/lib/auth/roles";
import { CompanyHeader } from "@/components/company/CompanyHeader";
import { CompanyLocationMap } from "@/components/company/CompanyLocationMap";
import { CompanyMemberList, type CompanyMember } from "@/components/company/CompanyMemberList";
import { CompanyMembershipRequests, type PendingMembershipRequest } from "@/components/company/CompanyMembershipRequests";
import type { Database } from "@/lib/types/database";

type Company = Database["public"]["Tables"]["companies"]["Row"];
type MemberRow = {
  profile: { id: string; first_name: string; last_name: string; job_title: string | null; avatar_url: string | null };
};
type RequestRow = {
  id: string;
  profile: { id: string; first_name: string; last_name: string; avatar_url: string | null };
};

export async function getCompanyProfileTitle(id: string): Promise<string> {
  const supabase = await createClient();
  const { data: company } = await supabase.from("companies").select("name").eq("id", id).maybeSingle();
  return company?.name ?? "Bedrijf";
}

// Gedeeld tussen de volledige pagina (/bedrijven/[id]) en de intercepted
// overlay (@modal/(.)bedrijven/[id]) — zie MemberProfileContent voor
// dezelfde reden.
export async function CompanyProfileContent({ id }: { id: string }) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: company } = await supabase.from("companies").select("*").eq("id", id).maybeSingle<Company>();

  if (!company) {
    notFound();
  }

  const [{ data: memberRows }, { data: requestRows }] = await Promise.all([
    supabase
      .from("company_members")
      .select("profile:profiles(id, first_name, last_name, job_title, avatar_url)")
      .eq("company_id", id)
      .returns<MemberRow[]>(),
    supabase
      .from("company_membership_requests")
      .select("id, profile:profiles(id, first_name, last_name, avatar_url)")
      .eq("company_id", id)
      .eq("status", "pending")
      .returns<RequestRow[]>(),
  ]);

  const canSeeRequests = isBoard(profile.role) || (memberRows ?? []).some((row) => row.profile.id === profile.id);

  const [logoUrl, avatarUrls] = await Promise.all([
    getSignedStorageUrl("company-logos", company.logo_url),
    getSignedStorageUrls(
      supabase,
      "avatars",
      [...(memberRows ?? []), ...(requestRows ?? [])].map((row) => row.profile.avatar_url)
    ),
  ]);

  const members: CompanyMember[] = (memberRows ?? []).map((row) => ({
    id: row.profile.id,
    first_name: row.profile.first_name,
    last_name: row.profile.last_name,
    job_title: row.profile.job_title,
    avatarUrl: row.profile.avatar_url ? (avatarUrls.get(row.profile.avatar_url) ?? null) : null,
  }));

  const pendingRequests: PendingMembershipRequest[] = canSeeRequests
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
      <CompanyHeader company={company} logoUrl={logoUrl} editHref={isBoard(profile.role) ? `/bedrijven/${id}/bewerken` : undefined} />

      {/* Direct onder de header, boven de kaart en ledenlijst — anders is
          deze actie makkelijk te missen als je hier via de notificatie
          binnenkomt en de kaart+ledenlijst het scherm al vullen. */}
      {canSeeRequests && <CompanyMembershipRequests companyId={id} requests={pendingRequests} />}

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Werkzaam bij dit bedrijf</h2>
        <CompanyMemberList members={members} />
      </div>

      {company.show_address && company.latitude !== null && company.longitude !== null && (
        <CompanyLocationMap
          company={{
            id: company.id,
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
