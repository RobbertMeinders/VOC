import type { Metadata } from "next";
import { Mail, Phone, Globe } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { Avatar } from "@/components/ui/Avatar";
import { ROLE_LABELS } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Profiel" };

export default async function ProfielPage() {
  const profile = await requireProfile();

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-foreground">Mijn profiel</h1>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Avatar firstName={profile.first_name} lastName={profile.last_name} avatarUrl={profile.avatar_url} size={64} />
          <div>
            <p className="text-lg font-semibold text-foreground">
              {profile.first_name} {profile.last_name}
            </p>
            {profile.job_title && <p className="text-sm text-muted">{profile.job_title}</p>}
            <span className="mt-1 inline-block rounded-full bg-voc-red-light px-2.5 py-0.5 text-xs font-medium text-voc-red">
              {ROLE_LABELS[profile.role]}
            </span>
          </div>
        </div>

        <dl className="mt-6 flex flex-col gap-3 border-t border-border pt-6 text-sm">
          <div className="flex items-center gap-3">
            <Mail size={16} className="shrink-0 text-muted" />
            <dd className="text-foreground">{profile.email}</dd>
          </div>
          {profile.phone && (
            <div className="flex items-center gap-3">
              <Phone size={16} className="shrink-0 text-muted" />
              <dd className="text-foreground">{profile.phone}</dd>
            </div>
          )}
          {profile.website && (
            <div className="flex items-center gap-3">
              <Globe size={16} className="shrink-0 text-muted" />
              <dd className="text-foreground">{profile.website}</dd>
            </div>
          )}
        </dl>

        <p className="mt-6 border-t border-border pt-4 text-xs text-muted">
          Je profiel en bedrijfsgegevens bewerken kan vanaf fase 2 van het ledenportaal.
        </p>
      </div>
    </div>
  );
}
