import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { cachedQuery } from "@/lib/cache/queryCache";
import { PageHeader } from "@/components/ui/PageHeader";
import { BeheerLedenListClient, type BeheerMemberRow } from "@/components/beheer/BeheerLedenListClient";
import { isAdmin } from "@/lib/auth/roles";
import { resolvePeriodRange } from "@/lib/statistics/period";
import type { UserRole } from "@/lib/types/database";

// get_people_directory() (0208_people_directory.sql): unie van profiles +
// openstaande uitnodigingen + contacten, gededuplicerd op e-mailadres, incl.
// al-opgeloste weergave-bedrijfsnaam -- vervangt get_members_directory()
// hier en maakt de losse company_members-query hieronder overbodig.
// Discriminated union op `source` (zelfde reden als BeheerMemberRow in
// BeheerLedenListClient): bij source === "profiel" weet TypeScript dan dat
// slug/role altijd een waarde hebben, zonder non-null-assertions.
type PersonDirectoryRowBase = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  avatar_thumb_url: string | null;
  is_organization_account: boolean;
  anonymized_at: string | null;
  company_name: string | null;
  last_active_at: string | null;
};
type PersonDirectoryRow =
  | (PersonDirectoryRowBase & { source: "profiel"; person_status: "geactiveerd" | "gedeactiveerd"; slug: string; role: UserRole; is_active: boolean })
  | (PersonDirectoryRowBase & { source: "uitnodiging"; person_status: "uitgenodigd"; slug: null; role: UserRole | null; is_active: false })
  | (PersonDirectoryRowBase & { source: "contact"; person_status: "nog_niet_uitgenodigd"; slug: null; role: null; is_active: false });
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

  const [{ data: people }, { data: boardPositions }, { data: attendedRows }] = await cachedQuery(
    "beheer-leden-page-data",
    300_000,
    () =>
      Promise.all([
        supabase.rpc("get_people_directory").returns<PersonDirectoryRow[]>(),
        // Alleen actuele aanstellingen (ended_at is null) — zie
        // 0107_vereniging_bestuur_commissies.sql. Geldt alleen voor echte
        // profielen, dus de lookup hieronder matcht toch nooit op een
        // uitnodiging/contact-id.
        supabase.from("board_positions").select("profile_id, title").is("ended_at", null).returns<BoardPositionRow[]>(),
        supabase
          .from("activity_registrations")
          .select("profile_id")
          .eq("attended", true)
          .gte("created_at", twelveMonthsAgo.toISOString()),
      ])
  );
  const attendedProfileIds = new Set((attendedRows ?? []).map((r) => r.profile_id));

  const boardTitleByProfile = new Map<string, string>();
  for (const position of boardPositions ?? []) {
    boardTitleByProfile.set(position.profile_id, position.title);
  }

  // Thumbnail-paden in dezelfde batch-aanroep (performance-audit #1): de
  // lijst toont een avatar van 36px, daar is de kleine versie (max 160px)
  // ruim genoeg voor. Een lid zonder thumbnail valt terug op de volle avatar.
  // Uitnodigingen/contacten hebben nooit een avatar (null), die vallen hier
  // vanzelf weg via flatMap.
  const avatarUrls = await getSignedStorageUrls(
    supabase,
    "avatars",
    (people ?? []).flatMap((p) => [p.avatar_url, p.avatar_thumb_url])
  );

  const members: BeheerMemberRow[] = (people ?? []).map((p) => {
    const path = p.avatar_thumb_url ?? p.avatar_url;
    const base = {
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      email: p.email,
      phone: p.phone,
      avatar_url: p.avatar_url,
      avatarUrl: path ? (avatarUrls.get(path) ?? null) : null,
      is_organization_account: p.is_organization_account,
      anonymized_at: p.anonymized_at,
      companyName: p.company_name,
      boardTitle: boardTitleByProfile.get(p.id) ?? null,
      last_active_at: p.last_active_at,
    };
    if (p.source === "profiel") {
      return {
        ...base,
        source: p.source,
        personStatus: p.person_status,
        slug: p.slug,
        role: p.role,
        is_active: p.is_active,
        neverAttended12mo: !attendedProfileIds.has(p.id),
      };
    }
    if (p.source === "uitnodiging") {
      return {
        ...base,
        source: p.source,
        personStatus: p.person_status,
        slug: p.slug,
        role: p.role,
        is_active: p.is_active,
        neverAttended12mo: false,
      };
    }
    return {
      ...base,
      source: p.source,
      personStatus: p.person_status,
      slug: p.slug,
      role: p.role,
      is_active: p.is_active,
      neverAttended12mo: false,
    };
  });

  return (
    <div>
      <PageHeader title="Leden" />

      <BeheerLedenListClient members={members} viewerId={viewer.id} canEditRole={isAdmin(viewer.role)} />
    </div>
  );
}
