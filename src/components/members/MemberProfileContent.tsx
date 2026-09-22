import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Mail, Pencil, Phone } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { formatLastActive } from "@/lib/format/date";
import { Avatar } from "@/components/ui/Avatar";
import { ExpandableText } from "@/components/ui/ExpandableText";
import { EntitySocialLinks } from "@/components/ui/EntitySocialLinks";
import { CompanyLogo } from "@/components/company/CompanyLogo";
import { MemberPostList } from "@/components/members/MemberPostList";
import { AttendedActivitiesSection } from "@/components/members/AttendedActivitiesSection";
import { isAdmin, isBoard } from "@/lib/auth/roles";
import { RoleEditor } from "@/components/members/RoleEditor";
import { AdminEditProfile } from "@/components/members/AdminEditProfile";
import { MemberActiveToggle } from "@/components/members/MemberActiveToggle";
import { fetchFeedPostsByAuthor } from "@/lib/feed/queries";
import { MEMBER_PROFILE_LIST_PREVIEW } from "@/lib/feed/pagination";
import type { Database } from "@/lib/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Membership = {
  company: { id: string; name: string; city: string | null; industry: string | null; logo_url: string | null } | null;
};
type AttendedActivity = { id: string; title: string; starts_at: string };

export async function getMemberProfileTitle(id: string): Promise<string> {
  const supabase = await createClient();
  const { data: member } = await supabase.from("profiles").select("first_name, last_name").eq("id", id).maybeSingle();
  return member ? `${member.first_name} ${member.last_name}` : "Lid";
}

// Gedeeld tussen de volledige pagina (/leden/[id]) en de intercepted overlay
// (@modal/(.)leden/[id]) — zelfde content, alleen de buitenste wrapper
// (max-breedte, wel/niet gecentreerd) verschilt per aanroeper.
export async function MemberProfileContent({ id }: { id: string }) {
  const viewer = await requireProfile();
  const supabase = await createClient();
  const isOwnProfile = viewer.id === id;
  const canSeePrivate = isOwnProfile || isBoard(viewer.role);

  const { data: member } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle<Profile>();

  if (!member) {
    notFound();
  }

  const [avatarUrl, { data: membership }, { data: attendedRows }, posts] = await Promise.all([
    getSignedStorageUrl("avatars", member.avatar_url),
    supabase
      .from("company_members")
      .select("company:companies(id, name, city, industry, logo_url)")
      .eq("profile_id", id)
      .limit(1)
      .maybeSingle()
      .returns<Membership>(),
    supabase
      .from("activity_registrations")
      .select("activity:activities(id, title, starts_at)")
      .eq("profile_id", id)
      .eq("attended", true)
      .order("created_at", { ascending: false })
      .range(0, MEMBER_PROFILE_LIST_PREVIEW)
      .returns<{ activity: AttendedActivity | null }[]>(),
    fetchFeedPostsByAuthor(supabase, viewer.id, id, MEMBER_PROFILE_LIST_PREVIEW + 1),
  ]);

  const logoUrl = membership?.company?.logo_url
    ? await getSignedStorageUrl("company-logos", membership.company.logo_url)
    : null;

  // Instelling (zie /instellingen): een lid kan deze sectie voor andere
  // leden verbergen — zichzelf en bestuur/beheer zien 'm altijd.
  const canSeeAttended = member.show_attended_activities || canSeePrivate;
  const attendedActivities = canSeeAttended
    ? (attendedRows ?? [])
        .map((r) => r.activity)
        .filter((a): a is AttendedActivity => a !== null)
        .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar firstName={member.first_name} lastName={member.last_name} avatarUrl={avatarUrl} size={64} />
            <div className="min-w-0">
              <p className="break-words text-lg font-semibold text-foreground">
                {member.first_name} {member.last_name}
              </p>
              {member.job_title && <p className="text-sm text-muted">{member.job_title}</p>}
              {!member.is_active && (
                <span className="mt-1 inline-block rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-medium text-muted dark:bg-white/10">
                  Gedeactiveerd
                </span>
              )}
              {isBoard(viewer.role) && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                  <Clock size={12} />
                  Laatst actief: {formatLastActive(member.last_active_at)}
                </p>
              )}
            </div>
          </div>
          {isOwnProfile && (
            <>
              {/* Op mobiel alleen het potloodje — "Profiel aanpassen" als
                  volledige pil drukte naam/functie anders te veel opzij. */}
              <Link
                href="/profiel"
                aria-label="Profiel aanpassen"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:border-voc-red hover:text-voc-red sm:hidden"
              >
                <Pencil size={14} />
              </Link>
              <Link
                href="/profiel"
                className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-voc-red hover:text-voc-red sm:flex"
              >
                <Pencil size={14} />
                Profiel aanpassen
              </Link>
            </>
          )}
        </div>

        {member.bio && (
          <ExpandableText
            text={member.bio}
            lines={5}
            className="mt-4"
            expandLabel="Meer weergeven"
            collapseLabel="Minder weergeven"
          />
        )}

        <div className="mt-4 flex flex-col gap-1 border-t border-border pt-4">
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
          <EntitySocialLinks linkedinUrl={member.linkedin_url} />
        </div>
      </div>

      {/* Los blok net als "Werkzaam bij dit bedrijf" op de bedrijfspagina,
          i.p.v. genest in de profielkaart hierboven. */}
      {membership?.company && (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Werkzaam bij</h2>
          <Link
            href={`/bedrijven/${membership.company.id}`}
            className="flex items-center gap-3 rounded-xl border border-border p-3 hover:border-voc-red"
          >
            <CompanyLogo logoUrl={logoUrl} name={membership.company.name} size={44} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{membership.company.name}</p>
              <p className="truncate text-xs text-muted">
                {membership.company.industry && <span>{membership.company.industry}</span>}
                {membership.company.industry && membership.company.city && <span> — </span>}
                {membership.company.city && <span>{membership.company.city}</span>}
              </p>
            </div>
          </Link>
        </div>
      )}

      {attendedActivities.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Bijgewoonde evenementen</h2>
          <AttendedActivitiesSection memberId={id} activities={attendedActivities} />
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Berichten</h2>
        <MemberPostList
          memberId={id}
          initialPosts={posts}
          currentUserId={viewer.id}
          canModerate={isBoard(viewer.role)}
          canEditOthers={isAdmin(viewer.role)}
        />
      </div>

      {isAdmin(viewer.role) && (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Beheer</h2>
          <div className="flex flex-col gap-3">
            <RoleEditor memberId={member.id} currentRole={member.role} />
            <AdminEditProfile member={member} avatarUrl={avatarUrl} />
            {member.id !== viewer.id && <MemberActiveToggle memberId={member.id} initialActive={member.is_active} />}
          </div>
        </div>
      )}
    </div>
  );
}
