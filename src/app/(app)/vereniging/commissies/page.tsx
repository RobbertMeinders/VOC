import type { Metadata } from "next";
import Link from "next/link";
import { UsersRound } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Avatar } from "@/components/ui/Avatar";
import { CommissionApplyForm } from "@/components/vereniging/CommissionApplyForm";
import { VerenigingHero } from "@/components/vereniging/VerenigingHero";
import { memberHref } from "@/lib/members/slug";

export const metadata: Metadata = { title: "Commissies" };

type CommissionRow = { id: string; name: string; description: string | null };
type MembershipRow = {
  commission_id: string;
  profile_id: string;
  profile: { id: string; slug: string; first_name: string; last_name: string; avatar_url: string | null; avatar_thumb_url: string | null } | null;
};
type ApplicationRow = { commission_id: string; status: string };

export default async function CommissiesPage() {
  const viewer = await requireProfile();
  const supabase = await createClient();

  const [{ data: commissions }, { data: memberships }, { data: ownApplications }] = await Promise.all([
    supabase.from("commissions").select("id, name, description").is("archived_at", null).order("name").returns<CommissionRow[]>(),
    supabase
      .from("commission_memberships")
      .select("commission_id, profile_id, profile:profiles!commission_memberships_profile_id_fkey(id, slug, first_name, last_name, avatar_url, avatar_thumb_url)")
      .returns<MembershipRow[]>(),
    supabase
      .from("commission_applications")
      .select("commission_id, status")
      .eq("profile_id", viewer.id)
      .eq("status", "in_behandeling")
      .returns<ApplicationRow[]>(),
  ]);

  const avatarUrls = await getSignedStorageUrls(
    supabase,
    "avatars",
    (memberships ?? []).flatMap((m) => [m.profile?.avatar_url, m.profile?.avatar_thumb_url])
  );
  const pendingCommissionIds = new Set((ownApplications ?? []).map((a) => a.commission_id));
  const memberCommissionIds = new Set(
    (memberships ?? []).filter((m) => m.profile_id === viewer.id).map((m) => m.commission_id)
  );
  // UX-feedback: één gedeelde aanmeld-CTA onderaan i.p.v. een losse knop
  // per kaart — alleen commissies waar de kijker nog geen lid van is en
  // geen openstaande aanvraag voor heeft, komen in de keuzelijst.
  const applyOptions = (commissions ?? [])
    .filter((c) => !memberCommissionIds.has(c.id) && !pendingCommissionIds.has(c.id))
    .map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="flex flex-col gap-6">
      <VerenigingHero title="Commissies" description="Bekijk welke commissies er zijn en wie erin zit." />

      {!commissions || commissions.length === 0 ? (
        <ComingSoon icon={UsersRound} title="Nog geen commissies" description="Het bestuur heeft nog geen commissies aangemaakt." />
      ) : (
        // gap-5 i.p.v. gap-3: een commissie telt doorgaans maar een paar
        // leden, geen lange lijst — iets meer lucht ertussen past bij hoe
        // weinig elke kaart al bevat, i.p.v. ze dicht op elkaar te proppen.
        <div className="flex flex-col gap-5">
          {commissions.map((commission) => {
            const members = (memberships ?? []).filter((m) => m.commission_id === commission.id && m.profile);
            const isMember = members.some((m) => m.profile_id === viewer.id);
            const isPending = pendingCommissionIds.has(commission.id);

            return (
              <div key={commission.id} className="rounded-2xl bg-surface p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{commission.name}</p>
                    {commission.description && <p className="mt-0.5 text-xs text-muted">{commission.description}</p>}
                  </div>
                  {(isMember || isPending) && (
                    <div className="shrink-0">
                      {isMember ? (
                        <span className="rounded-full bg-petrol-soft px-3 py-1 text-xs font-medium text-petrol">Lid</span>
                      ) : (
                        <span className="text-xs font-medium text-muted">Aanvraag in behandeling</span>
                      )}
                    </div>
                  )}
                </div>

                {members.length > 0 && (
                  // Een commissie telt meestal maar een paar leden — die
                  // mogen dan ook echt zichtbaar zijn i.p.v. als kleine
                  // naamlabeltjes weggedrukt: grotere foto, eigen kaartje
                  // per lid, en doorklikbaar naar het profiel.
                  <div className="mt-4 flex flex-wrap gap-3 border-t border-border pt-4">
                    {members.map((member) => {
                      const path = member.profile!.avatar_thumb_url ?? member.profile!.avatar_url;
                      const avatarUrl = path ? (avatarUrls.get(path) ?? null) : null;
                      return (
                        <Link
                          key={member.profile_id}
                          href={memberHref(member.profile!)}
                          className="flex items-center gap-2.5 rounded-full bg-raised py-1.5 pl-1.5 pr-4 hover:bg-black/[.06] dark:hover:bg-white/[.08]"
                        >
                          <Avatar firstName={member.profile!.first_name} lastName={member.profile!.last_name} avatarUrl={avatarUrl} size={36} />
                          <span className="text-sm font-medium text-foreground">
                            {member.profile!.first_name} {member.profile!.last_name}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CommissionApplyForm options={applyOptions} />
    </div>
  );
}
