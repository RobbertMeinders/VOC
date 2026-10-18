import Link from "next/link";
import { IdCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { Avatar } from "@/components/ui/Avatar";
import { ComingSoon } from "@/components/ui/ComingSoon";

type BoardPositionRow = {
  id: string;
  title: string;
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    avatar_thumb_url: string | null;
  } | null;
};

type MembershipRow = { profile_id: string; is_primary: boolean; company: { name: string } | null };

// Wordt letterlijk hetzelfde gebouwd en getoond op zowel /beheer/vereniging/
// bestuur (beheer) als /vereniging/bestuur (leden) — alleen de pagina
// eromheen (kop, eventuele beheerlink) verschilt. Toont uitsluitend
// board_positions zonder ended_at: beëindigde aanstellingen verdwijnen
// hiermee vanzelf, zonder dat deze component zelf "huidig" hoeft te bepalen.
export async function BestuurContent() {
  const supabase = await createClient();

  const { data: positions } = await supabase
    .from("board_positions")
    .select("id, title, profile:profiles!board_positions_profile_id_fkey(id, first_name, last_name, avatar_url, avatar_thumb_url)")
    .is("ended_at", null)
    .order("started_at", { ascending: true })
    .returns<BoardPositionRow[]>();

  const activePositions = (positions ?? []).filter((p) => p.profile);

  if (activePositions.length === 0) {
    return (
      <ComingSoon
        icon={IdCard}
        title="Nog geen bestuur toegewezen"
        description="Zodra het bestuur bestuursfuncties toewijst via Beheer -> Leden, verschijnen die hier."
      />
    );
  }

  const { data: memberships } = await supabase
    .from("company_members")
    .select("profile_id, is_primary, company:companies(name)")
    .returns<MembershipRow[]>();

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

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {activePositions.map(({ id, title, profile }) => {
        if (!profile) return null;
        const path = profile.avatar_thumb_url ?? profile.avatar_url;
        const avatarUrl = path ? (avatarUrls.get(path) ?? null) : null;
        const companyName = companyByProfile.get(profile.id);
        return (
          <Link
            key={id}
            href={`/leden/${profile.id}`}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm hover:border-voc-red/40"
          >
            <Avatar firstName={profile.first_name} lastName={profile.last_name} avatarUrl={avatarUrl} size={48} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {profile.first_name} {profile.last_name}
              </p>
              <p className="truncate text-xs font-medium text-voc-red-text">{title}</p>
              {companyName && <p className="truncate text-xs text-muted">{companyName}</p>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
