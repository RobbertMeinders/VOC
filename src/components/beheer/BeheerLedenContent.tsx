import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { cachedQuery } from "@/lib/cache/queryCache";
import { PageHeader } from "@/components/ui/PageHeader";
import { BeheerLedenListClient, type BeheerMemberRow } from "@/components/beheer/BeheerLedenListClient";
import { isAdmin } from "@/lib/auth/roles";
import { resolvePeriodRange } from "@/lib/statistics/period";
import type { Database } from "@/lib/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type MembershipRow = { profile_id: string; is_primary: boolean; company: { name: string } | null };
type BoardPositionRow = { profile_id: string; title: string };

// Snel overzicht voor beheer: rol wijzigen en activeren/deactiveren direct
// in de lijst, i.p.v. eerst naar elk profiel apart te moeten navigeren.
// Bestuursleden mogen de pagina zelf zien (zelfde grens als Beheer → Leden
// in het menu), maar RoleEditor blijft beheerder-only — dat is ook de echte
// grens in updateMemberRoleAction, dit is alleen voor een nette pagina.
export async function BeheerLedenContent() {
  const viewer = await requireBoard();
  const supabase = await createClient();

  // requireAdmin hierboven is de echte grens — elke beheerder die hier komt
  // ziet toch al dezelfde, ongefilterde lijst, dus delen tussen beheerders
  // is veilig (zelfde redenering als leden-page-data op /leden). Filteren
  // (zoeken, rol, status) gebeurt nu client-side (BeheerLedenListClient),
  // dus de cache zelf blijft ongewijzigd.
  // get_members_directory (0061_masked_contact_fields.sql) i.p.v.
  // rechtstreeks .from("profiles") — voor beheer/beheerder geeft de RPC
  // toch alle e-mailadressen/telefoonnummers terug (is_board()-uitzondering
  // in de maskering), maar dit voorkomt dat de query zelf afwijkt van de
  // enige toegestane manier om andermans contactgegevens op te vragen.
  // Foutenrapport H4: zelfde "nooit naar een activiteit (12 mnd)"-definitie
  // als het signaal op Statistieken -> Overzicht (attended=true binnen de
  // laatste 12 maanden), zodat de signaal-link hier precies dezelfde leden
  // toont als het bijbehorende aantal daar.
  const twelveMonthsAgo = resolvePeriodRange("12m").start;

  const [{ data: allProfiles }, { data: memberships }, { data: boardPositions }, { data: attendedRows }] = await cachedQuery(
    "beheer-leden-page-data",
    300_000,
    () =>
      Promise.all([
        supabase.rpc("get_members_directory").returns<ProfileRow[]>(),
        // UX-review Z4: ook op bedrijfsnaam kunnen zoeken, niet alleen naam/e-mail.
        supabase.from("company_members").select("profile_id, is_primary, company:companies(name)").returns<MembershipRow[]>(),
        // Alleen actuele aanstellingen (ended_at is null) — zie
        // 0107_vereniging_bestuur_commissies.sql.
        supabase.from("board_positions").select("profile_id, title").is("ended_at", null).returns<BoardPositionRow[]>(),
        supabase
          .from("activity_registrations")
          .select("profile_id")
          .eq("attended", true)
          .gte("created_at", twelveMonthsAgo.toISOString()),
      ])
  );
  const attendedProfileIds = new Set((attendedRows ?? []).map((r) => r.profile_id));

  const companyByProfile = new Map<string, string>();
  for (const membership of memberships ?? []) {
    if (!membership.company) continue;
    if (membership.is_primary || !companyByProfile.has(membership.profile_id)) {
      companyByProfile.set(membership.profile_id, membership.company.name);
    }
  }

  const boardTitleByProfile = new Map<string, string>();
  for (const position of boardPositions ?? []) {
    boardTitleByProfile.set(position.profile_id, position.title);
  }

  // Thumbnail-paden in dezelfde batch-aanroep (performance-audit #1): de
  // lijst toont een avatar van 36px, daar is de kleine versie (max 160px)
  // ruim genoeg voor. Een lid zonder thumbnail valt terug op de volle avatar.
  const avatarUrls = await getSignedStorageUrls(
    supabase,
    "avatars",
    (allProfiles ?? []).flatMap((p) => [p.avatar_url, p.avatar_thumb_url])
  );

  const members: BeheerMemberRow[] = (allProfiles ?? []).map((p) => {
    const path = p.avatar_thumb_url ?? p.avatar_url;
    return {
      id: p.id,
      slug: p.slug,
      first_name: p.first_name,
      last_name: p.last_name,
      email: p.email,
      phone: p.phone,
      avatar_url: p.avatar_url,
      avatarUrl: path ? (avatarUrls.get(path) ?? null) : null,
      role: p.role,
      is_active: p.is_active,
      is_organization_account: p.is_organization_account,
      companyName: companyByProfile.get(p.id) ?? null,
      boardTitle: boardTitleByProfile.get(p.id) ?? null,
      last_active_at: p.last_active_at,
      neverAttended12mo: !attendedProfileIds.has(p.id),
    };
  });

  return (
    <div>
      <PageHeader title="Leden" />

      <BeheerLedenListClient members={members} viewerId={viewer.id} canEditRole={isAdmin(viewer.role)} />
    </div>
  );
}
