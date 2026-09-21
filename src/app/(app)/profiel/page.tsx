import type { Metadata } from "next";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { clsx } from "clsx";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { EmailChangeForm } from "@/components/profile/EmailChangeForm";
import { CompanyMembershipForm } from "@/components/profile/CompanyMembershipForm";
import { PushToggle } from "@/components/profile/PushToggle";
import { ThemeToggle } from "@/components/profile/ThemeToggle";
import { ROLE_BADGE_CLASS, ROLE_LABELS } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Profiel" };

type Membership = { company: { id: string; name: string; city: string | null } | null };

export default async function ProfielPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: membership }, avatarUrl] = await Promise.all([
    supabase
      .from("company_members")
      .select("company:companies(id, name, city)")
      .eq("profile_id", profile.id)
      .limit(1)
      .maybeSingle()
      .returns<Membership>(),
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
      ) : (
        <CompanyMembershipForm hasCompany={false} />
      )}

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <ProfileForm profile={profile} avatarUrl={avatarUrl} />
        <div className="mt-4 border-t border-border pt-4">
          <EmailChangeForm currentEmail={profile.email} />
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-sm font-medium text-foreground">Thema</p>
          <ThemeToggle />
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-sm font-medium text-foreground">Pushmeldingen</p>
          <PushToggle />
        </div>
      </div>
    </div>
  );
}
