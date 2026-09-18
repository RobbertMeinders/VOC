import type { Metadata } from "next";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ROLE_LABELS } from "@/lib/auth/roles";

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
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Mijn profiel</h1>
        <span className="rounded-full bg-voc-red-light px-2.5 py-0.5 text-xs font-medium text-voc-red">
          {ROLE_LABELS[profile.role]}
        </span>
      </div>

      {membership?.company && (
        <Link
          href={`/bedrijven/${membership.company.id}`}
          className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground shadow-sm hover:border-voc-red"
        >
          <Building2 size={16} className="text-muted" />
          Werkzaam bij <span className="font-medium">{membership.company.name}</span>
          {membership.company.city && <span className="text-muted">— {membership.company.city}</span>}
        </Link>
      )}

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <ProfileForm profile={profile} avatarUrl={avatarUrl} />
      </div>
    </div>
  );
}
