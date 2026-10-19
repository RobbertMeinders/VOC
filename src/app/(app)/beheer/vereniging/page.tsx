import type { Metadata } from "next";
import { Info, UserCheck, UsersRound } from "lucide-react";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl, getSignedStorageUrls } from "@/lib/supabase/storage";
import { getOrgProfile } from "@/lib/settings/org-profile";
import { Chip } from "@/components/ui/Chip";
import { PageHeader } from "@/components/ui/PageHeader";
import { OrgProfileForm } from "@/components/beheer/OrgProfileForm";
import { BestuurAdminContent, type BoardMemberRow, type MemberOption as BoardMemberOption } from "@/components/beheer/BestuurAdminContent";
import { CommissiesAdminContent, type CommissionAdminRow, type MemberOption } from "@/components/beheer/CommissiesAdminContent";

export const metadata: Metadata = { title: "Vereniging" };

// VOC Hub — Beheeromgeving: Over de VOC, Bestuur en Commissies stonden als drie
// losse beheerpagina's naast elkaar voor wat inhoudelijk één onderwerp is
// (de vereniging zelf) — nu tabs op één pagina, zelfde patroon als
// /beheer/instroom. Oude routes (over-ons/bestuur/commissies) redirecten
// hierheen.
const TABS = [
  { key: "over-ons", label: "Over de VOC", icon: Info },
  { key: "bestuur", label: "Bestuur", icon: UserCheck },
  { key: "commissies", label: "Commissies", icon: UsersRound },
] as const;
type TabKey = (typeof TABS)[number]["key"];

async function OverOnsTab() {
  const orgProfile = await getOrgProfile();
  const headerImageUrl = orgProfile.header_image_path ? await getSignedStorageUrl("news-images", orgProfile.header_image_path) : null;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Inhoud voor de pagina Over de VOC die leden via Vereniging in de hoofdnavigatie bereiken. Leeg laten betekent: dit onderdeel
        staat nog niet op de pagina.
      </p>
      <OrgProfileForm orgProfile={orgProfile} headerImageUrl={headerImageUrl} />
    </div>
  );
}

type BoardPositionRow = {
  id: string;
  title: string;
  profile: { id: string; first_name: string; last_name: string; avatar_url: string | null; avatar_thumb_url: string | null } | null;
};
type CompanyMembershipRow = { profile_id: string; is_primary: boolean; company: { name: string } | null };
type ActiveProfileRow = { id: string; first_name: string; last_name: string };

async function BestuurTab() {
  const supabase = await createClient();

  const [{ data: positions }, { data: activeProfiles }, { data: memberships }] = await Promise.all([
    supabase
      .from("board_positions")
      .select("id, title, profile:profiles!board_positions_profile_id_fkey(id, first_name, last_name, avatar_url, avatar_thumb_url)")
      .is("ended_at", null)
      .order("started_at", { ascending: true })
      .returns<BoardPositionRow[]>(),
    supabase.from("profiles").select("id, first_name, last_name").eq("is_active", true).order("first_name").returns<ActiveProfileRow[]>(),
    supabase.from("company_members").select("profile_id, is_primary, company:companies(name)").returns<CompanyMembershipRow[]>(),
  ]);

  const activePositions = (positions ?? []).filter((p) => p.profile);

  const companyByProfile = new Map<string, string>();
  for (const membership of memberships ?? []) {
    if (!membership.company) continue;
    if (membership.is_primary || !companyByProfile.has(membership.profile_id)) {
      companyByProfile.set(membership.profile_id, membership.company.name);
    }
  }

  const avatarUrls = await getSignedStorageUrls(
    supabase,
    "avatars",
    activePositions.flatMap((p) => [p.profile?.avatar_url, p.profile?.avatar_thumb_url])
  );

  const boardMembers: BoardMemberRow[] = activePositions.map(({ title, profile }) => {
    const p = profile!;
    const path = p.avatar_thumb_url ?? p.avatar_url;
    return {
      profileId: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      avatarUrl: path ? (avatarUrls.get(path) ?? null) : null,
      companyName: companyByProfile.get(p.id) ?? null,
      title,
    };
  });

  const boardProfileIds = new Set(boardMembers.map((m) => m.profileId));
  const memberOptions: BoardMemberOption[] = (activeProfiles ?? [])
    .filter((p) => !boardProfileIds.has(p.id))
    .map((p) => ({ id: p.id, name: `${p.first_name} ${p.last_name}` }));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">Zo ziet de bestuurspagina er voor leden uit.</p>
      <BestuurAdminContent boardMembers={boardMembers} memberOptions={memberOptions} />
    </div>
  );
}

type CommissionRow = { id: string; name: string; description: string | null; archived_at: string | null };
type CommissionMembershipRow = {
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

async function CommissiesTab() {
  const supabase = await createClient();

  const [{ data: commissions }, { data: memberships }, { data: applications }, { data: activeProfiles }] = await Promise.all([
    supabase.from("commissions").select("id, name, description, archived_at").returns<CommissionRow[]>(),
    supabase
      .from("commission_memberships")
      .select("commission_id, profile_id, profile:profiles!commission_memberships_profile_id_fkey(id, first_name, last_name, avatar_url, avatar_thumb_url)")
      .returns<CommissionMembershipRow[]>(),
    supabase
      .from("commission_applications")
      .select(
        "id, commission_id, profile_id, created_at, profile:profiles!commission_applications_profile_id_fkey(id, first_name, last_name, avatar_url, avatar_thumb_url)"
      )
      .eq("status", "in_behandeling")
      .returns<ApplicationRow[]>(),
    supabase.from("profiles").select("id, first_name, last_name").eq("is_active", true).order("first_name").returns<ActiveProfileRow[]>(),
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
      <p className="text-sm text-muted">Commissies aanmaken, leden toevoegen of verwijderen, en aanmeldingen van leden beoordelen.</p>
      <CommissiesAdminContent commissions={commissionRows} memberOptions={memberOptions} />
    </div>
  );
}

export default async function VerenigingBeheerPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireBoard();
  const { tab } = await searchParams;
  const activeTab: TabKey = TABS.some((t) => t.key === tab) ? (tab as TabKey) : "over-ons";

  return (
    <div>
      <PageHeader title="Vereniging" description="Inhoud, bestuur en commissies. Leden zien dit onder Vereniging." />

      <div className="sticky top-14 z-10 -mx-4 mb-4 flex gap-1.5 overflow-x-auto bg-background px-4 py-2 md:top-0 md:-mx-16 md:px-16">
        {TABS.map((t) => (
          <Chip
            key={t.key}
            href={t.key === "over-ons" ? "/beheer/vereniging" : `/beheer/vereniging?tab=${t.key}`}
            active={activeTab === t.key}
          >
            <t.icon size={14} />
            {t.label}
          </Chip>
        ))}
      </div>

      {activeTab === "over-ons" && <OverOnsTab />}
      {activeTab === "bestuur" && <BestuurTab />}
      {activeTab === "commissies" && <CommissiesTab />}
    </div>
  );
}
