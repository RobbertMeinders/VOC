import type { Metadata } from "next";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { MemberFilters } from "@/components/members/MemberFilters";
import { MemberRow, type MemberListItem } from "@/components/members/MemberRow";
import { NetworkTabs } from "@/components/layout/NetworkTabs";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Leden" };

type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  company_members: { is_primary: boolean; company: { id: string; name: string; industry: string | null } | null }[];
};

export default async function LedenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; branche?: string }>;
}) {
  const { q, branche } = await searchParams;
  const supabase = await createClient();

  const [{ data: profileRows }, { data: companies }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, avatar_url, company_members(is_primary, company:companies(id, name, industry))"
      )
      .order("last_name")
      .returns<ProfileRow[]>(),
    supabase.from("companies").select("industry"),
  ]);

  const branches = Array.from(
    new Set((companies ?? []).map((c) => c.industry).filter((v): v is string => Boolean(v)))
  ).sort((a, b) => a.localeCompare(b));

  const members: MemberListItem[] = (profileRows ?? []).map((row) => {
    const membership = row.company_members.find((m) => m.is_primary) ?? row.company_members[0];
    return {
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      avatarUrl: null,
      company: membership?.company ? { id: membership.company.id, name: membership.company.name } : null,
    };
  });

  const query = (q ?? "").trim().toLowerCase();
  const filtered = members.filter((member) => {
    const matchesQuery =
      !query ||
      `${member.first_name} ${member.last_name}`.toLowerCase().includes(query) ||
      member.company?.name.toLowerCase().includes(query);
    const matchesBranche =
      !branche || (profileRows ?? []).find((r) => r.id === member.id)?.company_members.some((m) => m.company?.industry === branche);
    return matchesQuery && matchesBranche;
  });

  const avatarUrls = await getSignedStorageUrls(
    supabase,
    "avatars",
    filtered.map((member) => (profileRows ?? []).find((r) => r.id === member.id)?.avatar_url)
  );
  const withAvatars = filtered.map((member) => {
    const path = (profileRows ?? []).find((r) => r.id === member.id)?.avatar_url;
    return { ...member, avatarUrl: path ? (avatarUrls.get(path) ?? null) : null };
  });

  return (
    <div>
      <h1 className="mb-3 text-xl font-semibold text-foreground">Netwerk</h1>
      <NetworkTabs />

      <MemberFilters branches={branches} />

      {withAvatars.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {withAvatars.map((member) => (
            <MemberRow key={member.id} member={member} />
          ))}
        </div>
      ) : (
        <ComingSoon icon={Users} title="Geen leden gevonden" description="Pas je zoekopdracht of filter aan." />
      )}
    </div>
  );
}
