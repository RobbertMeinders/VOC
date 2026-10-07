import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { cachedQuery } from "@/lib/cache/queryCache";
import { MemberListClient } from "@/components/members/MemberListClient";
import type { MemberListItem } from "@/components/members/MemberRow";
import { NetworkTabs } from "@/components/layout/NetworkTabs";

export const metadata: Metadata = { title: "Leden" };

type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  job_title: string | null;
  company_members: { is_primary: boolean; company: { id: string; name: string; industry: string | null } | null }[];
};

export default async function LedenPage() {
  const supabase = await createClient();

  // Zichtbaarheid is voor elk actief lid identiek (profiles_members_select
  // kent geen per-gebruiker variatie), dus dit resultaat delen tussen
  // leden/requests is veilig — scheelt een volledige tabel-scan bij elke
  // paginaweergave.
  const [{ data: profileRows }, { data: companies }] = await cachedQuery(
    "leden-page-data",
    60_000,
    () =>
      Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, first_name, last_name, avatar_url, job_title, company_members(is_primary, company:companies(id, name, industry))"
          )
          .eq("is_organization_account", false)
          .order("last_name")
          .returns<ProfileRow[]>(),
        supabase.from("companies").select("industry"),
      ])
  );

  const branches = Array.from(
    new Set((companies ?? []).map((c) => c.industry).filter((v): v is string => Boolean(v)))
  ).sort((a, b) => a.localeCompare(b));

  // UX-review Z1: filteren gebeurt nu client-side (MemberListClient), dus
  // hier geen query/branche-filter meer — gewoon alle leden met hun
  // avatar-URL doorgeven (lijst blijft binnen de ~500 items waarvoor dat
  // haalbaar is).
  const members: MemberListItem[] = (profileRows ?? []).map((row) => {
    const membership = row.company_members.find((m) => m.is_primary) ?? row.company_members[0];
    return {
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      avatarUrl: null,
      jobTitle: row.job_title,
      company: membership?.company
        ? { id: membership.company.id, name: membership.company.name, industry: membership.company.industry }
        : null,
    };
  });

  const avatarUrls = await getSignedStorageUrls(
    supabase,
    "avatars",
    (profileRows ?? []).map((row) => row.avatar_url)
  );
  const withAvatars = members.map((member, index) => {
    const path = profileRows?.[index]?.avatar_url;
    return { ...member, avatarUrl: path ? (avatarUrls.get(path) ?? null) : null };
  });

  return (
    <div>
      <h1 className="mb-3 text-xl font-semibold text-foreground">Netwerk</h1>
      <NetworkTabs />

      <MemberListClient members={withAvatars} branches={branches} />
    </div>
  );
}
