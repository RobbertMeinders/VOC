import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { cachedQuery } from "@/lib/cache/queryCache";
import { Avatar } from "@/components/ui/Avatar";
import { RoleEditor } from "@/components/members/RoleEditor";
import { MemberActiveToggle } from "@/components/members/MemberActiveToggle";
import { OrganizationAccountToggle } from "@/components/members/OrganizationAccountToggle";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { Database } from "@/lib/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

// Snel overzicht voor beheer: rol wijzigen en activeren/deactiveren direct
// in de lijst, i.p.v. eerst naar elk profiel apart te moeten navigeren.
// Alleen beheerders mogen dit — zelfde grens als RoleEditor/
// MemberActiveToggle op het profiel zelf (requireAdmin in hun eigen
// server actions is de echte grens, dit is alleen voor een nette pagina).
export async function BeheerLedenContent() {
  const viewer = await requireAdmin();
  const supabase = await createClient();

  // requireAdmin hierboven is de echte grens — elke beheerder die hier komt
  // ziet toch al dezelfde, ongefilterde lijst, dus delen tussen beheerders
  // is veilig (zelfde redenering als leden-page-data op /leden).
  // get_members_directory (0061_masked_contact_fields.sql) i.p.v.
  // rechtstreeks .from("profiles") — voor beheer/beheerder geeft de RPC
  // toch alle e-mailadressen/telefoonnummers terug (is_board()-uitzondering
  // in de maskering), maar dit voorkomt dat de query zelf afwijkt van de
  // enige toegestane manier om andermans contactgegevens op te vragen.
  const { data: profiles } = await cachedQuery("beheer-leden-page-data", 300_000, () =>
    supabase.rpc("get_members_directory").returns<ProfileRow[]>()
  );

  const avatarUrls = await getSignedStorageUrls(
    supabase,
    "avatars",
    (profiles ?? []).map((p) => p.avatar_url)
  );

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-foreground">Leden beheren</h1>
      <p className="mb-4 text-sm text-muted">Rol wijzigen en activeren/deactiveren, direct vanuit dit overzicht.</p>

      <div className="flex flex-col gap-3">
        {(profiles ?? []).map((member) => (
          <div key={member.id} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Avatar
                firstName={member.first_name}
                lastName={member.last_name}
                avatarUrl={member.avatar_url ? (avatarUrls.get(member.avatar_url) ?? null) : null}
                size={40}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {member.first_name} {member.last_name}
                </p>
                <p className="truncate text-xs text-muted">
                  {ROLE_LABELS[member.role]}
                  {!member.is_active && " · Gedeactiveerd"}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <div className="flex-1">
                <RoleEditor memberId={member.id} currentRole={member.role} />
              </div>
              {member.id !== viewer.id && (
                <div className="flex-1">
                  <MemberActiveToggle memberId={member.id} initialActive={member.is_active} />
                </div>
              )}
              <div className="flex-1">
                <OrganizationAccountToggle memberId={member.id} initialValue={member.is_organization_account} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
