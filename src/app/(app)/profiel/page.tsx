import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Clock } from "lucide-react";
import { clsx } from "clsx";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { EmailChangeForm } from "@/components/profile/EmailChangeForm";
import { CompanyMembershipForm } from "@/components/profile/CompanyMembershipForm";
import { ROLE_BADGE_CLASS, ROLE_LABELS } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Profiel" };

type Membership = { company: { id: string; name: string; city: string | null } | null };
type PendingRequest = { company: { id: string; name: string } | null };

export default async function ProfielPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: membership }, { data: pendingRequest }, avatarUrl] = await Promise.all([
    supabase
      .from("company_members")
      .select("company:companies(id, name, city)")
      .eq("profile_id", profile.id)
      .limit(1)
      .maybeSingle()
      .returns<Membership>(),
    supabase
      .from("company_membership_requests")
      .select("company:companies(id, name)")
      .eq("profile_id", profile.id)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle()
      .returns<PendingRequest>(),
    getSignedStorageUrl("avatars", profile.avatar_url),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Mijn profiel</h1>
        <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-medium", ROLE_BADGE_CLASS[profile.role])}>
          {ROLE_LABELS[profile.role]}
        </span>
      </div>

      {membership?.company ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 shadow-sm">
          <Link
            href={`/bedrijven/${membership.company.id}`}
            className="flex items-center gap-2 text-sm text-foreground hover:text-voc-red"
          >
            <Building2 size={16} className="text-muted" />
            Werkzaam bij <span className="font-medium">{membership.company.name}</span>
            {membership.company.city && <span className="text-muted">— {membership.company.city}</span>}
          </Link>
          <CompanyMembershipForm hasCompany />
        </div>
      ) : pendingRequest?.company ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 shadow-sm">
          <p className="flex items-center gap-2 text-sm text-muted">
            <Clock size={16} />
            Aanvraag voor <span className="font-medium text-foreground">{pendingRequest.company.name}</span> in
            behandeling
          </p>
          <CompanyMembershipForm hasCompany={false} defaultOpen={false} />
        </div>
      ) : (
        <CompanyMembershipForm hasCompany={false} />
      )}

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <ProfileForm profile={profile} avatarUrl={avatarUrl} />
        <div className="mt-4 border-t border-border pt-4">
          <EmailChangeForm currentEmail={profile.email} />
        </div>
      </div>
    </div>
  );
}
