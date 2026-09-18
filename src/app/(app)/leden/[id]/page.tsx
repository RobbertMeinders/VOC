import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Mail, Phone } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { Avatar } from "@/components/ui/Avatar";
import { clsx } from "clsx";
import { isAdmin, isBoard, ROLE_BADGE_CLASS, ROLE_LABELS } from "@/lib/auth/roles";
import { RoleEditor } from "@/components/members/RoleEditor";
import type { Database } from "@/lib/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Membership = { company: { id: string; name: string; city: string | null } | null };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: member } = await supabase.from("profiles").select("first_name, last_name").eq("id", id).maybeSingle();
  return { title: member ? `${member.first_name} ${member.last_name}` : "Lid" };
}

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireProfile();
  const supabase = await createClient();
  const canSeePrivate = viewer.id === id || isBoard(viewer.role);

  const { data: member } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle<Profile>();

  if (!member) {
    notFound();
  }

  const [avatarUrl, { data: membership }] = await Promise.all([
    getSignedStorageUrl("avatars", member.avatar_url),
    supabase
      .from("company_members")
      .select("company:companies(id, name, city)")
      .eq("profile_id", id)
      .limit(1)
      .maybeSingle()
      .returns<Membership>(),
  ]);

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <Avatar firstName={member.first_name} lastName={member.last_name} avatarUrl={avatarUrl} size={64} />
        <div>
          <p className="text-lg font-semibold text-foreground">
            {member.first_name} {member.last_name}
          </p>
          {member.job_title && <p className="text-sm text-muted">{member.job_title}</p>}
          <span className={clsx("mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", ROLE_BADGE_CLASS[member.role])}>
            {ROLE_LABELS[member.role]}
          </span>
        </div>
      </div>

      {isAdmin(viewer.role) && (
        <div className="mt-4">
          <RoleEditor memberId={member.id} currentRole={member.role} />
        </div>
      )}

      {membership?.company && (
        <Link
          href={`/bedrijven/${membership.company.id}`}
          className="mt-4 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:border-voc-red"
        >
          <Building2 size={16} className="text-muted" />
          <span className="font-medium">{membership.company.name}</span>
          {membership.company.city && <span className="text-muted">— {membership.company.city}</span>}
        </Link>
      )}

      <div className="mt-6 flex flex-col gap-2 border-t border-border pt-6">
        {member.show_email || canSeePrivate ? (
          <a
            href={`mailto:${member.email}`}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
          >
            <Mail size={16} className="text-muted" />
            {member.email}
          </a>
        ) : (
          <p className="flex items-center gap-3 px-3 py-2 text-sm text-muted">
            <Mail size={16} />
            E-mailadres is verborgen
          </p>
        )}
        {member.phone && (member.show_phone || canSeePrivate) && (
          <a
            href={`tel:${member.phone}`}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
          >
            <Phone size={16} className="text-muted" />
            {member.phone}
          </a>
        )}
      </div>
    </div>
  );
}
