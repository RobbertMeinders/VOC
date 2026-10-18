import type { Metadata } from "next";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { PageHeader } from "@/components/ui/PageHeader";
import { CommissiesAdminContent, type CommissionAdminRow, type MemberOption } from "@/components/beheer/CommissiesAdminContent";

export const metadata: Metadata = { title: "Commissies" };

type CommissionRow = { id: string; name: string; description: string | null; archived_at: string | null };
type MembershipRow = {
  commission_id: string;
  profile_id: string;
  profile: { id: string; first_name: string; last_name: string; avatar_url: string | null; avatar_thumb_url: string | null } | null;
};
type ApplicationRow = {
  id: string;
  commission_id: string;
  profile_id: string;
  created_at: string;
  profile: { id: string; first_name: string; last_name: string; avatar_url: string | null; avatar_thumb_url: string | null } | null;
};
type ProfileOptionRow = { id: string; first_name: string; last_name: string };

export default async function BeheerCommissiesPage() {
  await requireBoard();
  const supabase = await createClient();

  const [{ data: commissions }, { data: memberships }, { data: applications }, { data: activeProfiles }] = await Promise.all([
    supabase.from("commissions").select("id, name, description, archived_at").returns<CommissionRow[]>(),
    supabase
      .from("commission_memberships")
      .select("commission_id, profile_id, profile:profiles(id, first_name, last_name, avatar_url, avatar_thumb_url)")
      .returns<MembershipRow[]>(),
    supabase
      .from("commission_applications")
      .select("id, commission_id, profile_id, created_at, profile:profiles(id, first_name, last_name, avatar_url, avatar_thumb_url)")
      .eq("status", "in_behandeling")
      .returns<ApplicationRow[]>(),
    supabase.from("profiles").select("id, first_name, last_name").eq("is_active", true).order("first_name").returns<ProfileOptionRow[]>(),
  ]);

  const avatarPaths = [
    ...(memberships ?? []).flatMap((m) => [m.profile?.avatar_url, m.profile?.avatar_thumb_url]),
    ...(applications ?? []).flatMap((a) => [a.profile?.avatar_url, a.profile?.avatar_thumb_url]),
  ];
  const avatarUrls = await getSignedStorageUrls(supabase, "avatars", avatarPaths);

  function resolveAvatar(profile: { avatar_url: string | null; avatar_thumb_url: string | null } | null) {
    if (!profile) return null;
    const path = profile.avatar_thumb_url ?? profile.avatar_url;
    return path ? (avatarUrls.get(path) ?? null) : null;
  }

  const commissionRows: CommissionAdminRow[] = (commissions ?? [])
    .sort((a, b) => {
      if (Boolean(a.archived_at) !== Boolean(b.archived_at)) return a.archived_at ? 1 : -1;
      return a.name.localeCompare(b.name);
    })
    .map((commission) => ({
      id: commission.id,
      name: commission.name,
      description: commission.description,
      archivedAt: commission.archived_at,
      members: (memberships ?? [])
        .filter((m) => m.commission_id === commission.id && m.profile)
        .map((m) => ({
          profileId: m.profile_id,
          firstName: m.profile!.first_name,
          lastName: m.profile!.last_name,
          avatarUrl: resolveAvatar(m.profile),
        })),
      applications: (applications ?? [])
        .filter((a) => a.commission_id === commission.id && a.profile)
        .map((a) => ({
          id: a.id,
          profileId: a.profile_id,
          firstName: a.profile!.first_name,
          lastName: a.profile!.last_name,
          avatarUrl: resolveAvatar(a.profile),
          createdAt: a.created_at,
        })),
    }));

  const memberOptions: MemberOption[] = (activeProfiles ?? []).map((p) => ({
    id: p.id,
    name: `${p.first_name} ${p.last_name}`,
  }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Commissies"
        description="Commissies aanmaken, leden toevoegen of verwijderen, en aanmeldingen van leden beoordelen."
      />
      <CommissiesAdminContent commissions={commissionRows} memberOptions={memberOptions} />
    </div>
  );
}
