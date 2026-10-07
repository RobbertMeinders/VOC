import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { cachedQuery } from "@/lib/cache/queryCache";
import { PageHeader } from "@/components/ui/PageHeader";
import { BeheerLedenListClient, type BeheerMemberRow } from "@/components/beheer/BeheerLedenListClient";
import { isAdmin } from "@/lib/auth/roles";
import type { Database } from "@/lib/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type MembershipRow = { profile_id: string; is_primary: boolean; company: { name: string } | null };

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
  const [{ data: allProfiles }, { data: memberships }] = await cachedQuery("beheer-leden-page-data", 300_000, () =>
    Promise.all([
      supabase.rpc("get_members_directory").returns<ProfileRow[]>(),
      // UX-review Z4: ook op bedrijfsnaam kunnen zoeken, niet alleen naam/e-mail.
      supabase.from("company_members").select("profile_id, is_primary, company:companies(name)").returns<MembershipRow[]>(),
    ])
  );

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
    (allProfiles ?? []).map((p) => p.avatar_url)
  );

  const members: BeheerMemberRow[] = (allProfiles ?? []).map((p) => ({
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    email: p.email,
    avatar_url: p.avatar_url,
    avatarUrl: p.avatar_url ? (avatarUrls.get(p.avatar_url) ?? null) : null,
    role: p.role,
    is_active: p.is_active,
    is_organization_account: p.is_organization_account,
    companyName: companyByProfile.get(p.id) ?? null,
  }));

  return (
    <div>
      <PageHeader title="Leden beheren" description="Rol wijzigen en activeren/deactiveren, direct vanuit dit overzicht." />

      <BeheerLedenListClient members={members} viewerId={viewer.id} canEditRole={isAdmin(viewer.role)} />
    </div>
  );
}
