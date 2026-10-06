import { Suspense } from "react";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { cachedQuery } from "@/lib/cache/queryCache";
import { Avatar } from "@/components/ui/Avatar";
import { RoleEditor } from "@/components/members/RoleEditor";
import { MemberActiveToggle } from "@/components/members/MemberActiveToggle";
import { OrganizationAccountToggle } from "@/components/members/OrganizationAccountToggle";
import { DocumentSearch } from "@/components/documents/DocumentSearch";
import { MemberRoleStatusFilter } from "@/components/beheer/MemberRoleStatusFilter";
import { ROLE_LABELS, isAdmin } from "@/lib/auth/roles";
import type { Database } from "@/lib/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

// Snel overzicht voor beheer: rol wijzigen en activeren/deactiveren direct
// in de lijst, i.p.v. eerst naar elk profiel apart te moeten navigeren.
// Bestuursleden mogen de pagina zelf zien (zelfde grens als Beheer → Leden
// in het menu), maar RoleEditor blijft beheerder-only — dat is ook de echte
// grens in updateMemberRoleAction, dit is alleen voor een nette pagina.
export async function BeheerLedenContent({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; role?: string; active?: string }>;
}) {
  const viewer = await requireBoard();
  const { q, role, active } = (await searchParams) ?? {};
  const supabase = await createClient();

  // requireAdmin hierboven is de echte grens — elke beheerder die hier komt
  // ziet toch al dezelfde, ongefilterde lijst, dus delen tussen beheerders
  // is veilig (zelfde redenering als leden-page-data op /leden). Zoeken (q)
  // filtert hierna alsnog in JS, dus de cache zelf blijft per q ongewijzigd.
  // get_members_directory (0061_masked_contact_fields.sql) i.p.v.
  // rechtstreeks .from("profiles") — voor beheer/beheerder geeft de RPC
  // toch alle e-mailadressen/telefoonnummers terug (is_board()-uitzondering
  // in de maskering), maar dit voorkomt dat de query zelf afwijkt van de
  // enige toegestane manier om andermans contactgegevens op te vragen.
  const { data: allProfiles } = await cachedQuery("beheer-leden-page-data", 300_000, () =>
    supabase.rpc("get_members_directory").returns<ProfileRow[]>()
  );

  const query = (q ?? "").trim().toLowerCase();
  const profiles = (allProfiles ?? []).filter((p) => {
    const matchesQuery =
      !query || `${p.first_name} ${p.last_name}`.toLowerCase().includes(query) || p.email.toLowerCase().includes(query);
    const matchesRole = !role || p.role === role;
    const matchesActive = !active || (active === "actief" ? p.is_active : !p.is_active);
    return matchesQuery && matchesRole && matchesActive;
  });

  const avatarUrls = await getSignedStorageUrls(
    supabase,
    "avatars",
    (profiles ?? []).map((p) => p.avatar_url)
  );

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-foreground">Leden beheren</h1>
      <p className="mb-4 text-sm text-muted">Rol wijzigen en activeren/deactiveren, direct vanuit dit overzicht.</p>

      {(allProfiles ?? []).length > 0 && (
        <>
          <Suspense>
            <DocumentSearch placeholder="Zoek op naam of e-mailadres…" />
          </Suspense>
          <MemberRoleStatusFilter />
        </>
      )}

      <div className="flex flex-col gap-3">
        {(profiles ?? []).length === 0 && <p className="text-sm text-muted">Geen leden gevonden.</p>}
        {(profiles ?? []).map((member) => (
          <div key={member.id} className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
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
            <div className={`mt-2 grid grid-cols-1 gap-2 ${isAdmin(viewer.role) ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              {isAdmin(viewer.role) && <RoleEditor memberId={member.id} currentRole={member.role} compact />}
              {member.id !== viewer.id && (
                <MemberActiveToggle memberId={member.id} initialActive={member.is_active} compact />
              )}
              <OrganizationAccountToggle memberId={member.id} initialValue={member.is_organization_account} compact />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
