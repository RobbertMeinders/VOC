import type { Metadata } from "next";
import { UsersRound } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { PageHeader } from "@/components/ui/PageHeader";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Avatar } from "@/components/ui/Avatar";
import { CommissionApplyButton } from "@/components/vereniging/CommissionApplyButton";

export const metadata: Metadata = { title: "Commissies" };

type CommissionRow = { id: string; name: string; description: string | null };
type MembershipRow = {
  commission_id: string;
  profile_id: string;
  profile: { id: string; first_name: string; last_name: string; avatar_url: string | null; avatar_thumb_url: string | null } | null;
};
type ApplicationRow = { commission_id: string; status: string };

export default async function CommissiesPage() {
  const viewer = await requireProfile();
  const supabase = await createClient();

  const [{ data: commissions }, { data: memberships }, { data: ownApplications }] = await Promise.all([
    supabase.from("commissions").select("id, name, description").is("archived_at", null).order("name").returns<CommissionRow[]>(),
    supabase
      .from("commission_memberships")
      .select("commission_id, profile_id, profile:profiles!commission_memberships_profile_id_fkey(id, first_name, last_name, avatar_url, avatar_thumb_url)")
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

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Commissies" description="Meld je aan voor een commissie waar je graag aan meewerkt." />

      {!commissions || commissions.length === 0 ? (
        <ComingSoon icon={UsersRound} title="Nog geen commissies" description="Het bestuur heeft nog geen commissies aangemaakt." />
      ) : (
        <div className="flex flex-col gap-3">
          {commissions.map((commission) => {
            const members = (memberships ?? []).filter((m) => m.commission_id === commission.id && m.profile);
            const isMember = members.some((m) => m.profile_id === viewer.id);
            const isPending = pendingCommissionIds.has(commission.id);

            return (
              <div key={commission.id} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{commission.name}</p>
                    {commission.description && <p className="mt-0.5 text-xs text-muted">{commission.description}</p>}
                  </div>
                  <div className="shrink-0">
                    {isMember ? (
                      <span className="rounded-full bg-voc-red-light px-3 py-1 text-xs font-medium text-voc-red-text">Lid</span>
                    ) : isPending ? (
                      <span className="text-xs font-medium text-muted">Aanvraag in behandeling</span>
                    ) : (
                      <CommissionApplyButton commissionId={commission.id} commissionName={commission.name} />
                    )}
                  </div>
                </div>

                {members.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    {members.map((member) => {
                      const path = member.profile!.avatar_thumb_url ?? member.profile!.avatar_url;
                      const avatarUrl = path ? (avatarUrls.get(path) ?? null) : null;
                      return (
                        <div key={member.profile_id} className="flex items-center gap-1.5 rounded-full bg-black/5 py-1 pl-1 pr-3 dark:bg-white/10">
                          <Avatar firstName={member.profile!.first_name} lastName={member.profile!.last_name} avatarUrl={avatarUrl} size={22} />
                          <span className="text-xs text-foreground">
                            {member.profile!.first_name} {member.profile!.last_name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
