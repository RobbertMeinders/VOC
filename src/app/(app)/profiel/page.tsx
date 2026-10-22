import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Clock, Pencil } from "lucide-react";
import { clsx } from "clsx";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { hasIntroductionPost } from "@/lib/feed/queries";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { CompanyMembershipForm } from "@/components/profile/CompanyMembershipForm";
import { IntroductionPrompt } from "@/components/feed/IntroductionPrompt";
import { ROLE_BADGE_CLASS, ROLE_LABELS } from "@/lib/auth/roles";
import { companyHref } from "@/lib/company/slug";

export const metadata: Metadata = { title: "Profiel" };

type Membership = { company: { id: string; slug: string; name: string; city: string | null } | null };
type PendingRequest = { company: { id: string; name: string } | null };

export default async function ProfielPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: membership }, { data: pendingRequest }, avatarUrl, coverUrl, hasIntroduced] = await Promise.all([
    supabase
      .from("company_members")
      .select("company:companies(id, slug, name, city)")
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
    getSignedStorageUrl("profile-covers", profile.cover_url),
    hasIntroductionPost(supabase, profile.id),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[1.75rem] font-extrabold tracking-[-0.03em] text-foreground sm:text-[2rem]">Profiel bewerken</h1>
        <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-medium", ROLE_BADGE_CLASS[profile.role])}>
          {ROLE_LABELS[profile.role]}
        </span>
      </div>

      {/* Niet-wegklikbaar i.t.t. de versie op Home: dit is bewust de blijvende
          plek om een eerder overgeslagen introductie alsnog te plaatsen,
          zonder de hele onboarding opnieuw te doorlopen — zie
          IntroductionPrompt en hasIntroductionPost. */}
      {!hasIntroduced && <IntroductionPrompt dismissible={false} />}

      {membership?.company ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-surface px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href={companyHref(membership.company)}
              className="flex items-center gap-2 text-sm text-foreground hover:text-petrol"
            >
              <Building2 size={16} className="text-muted" />
              Werkzaam bij <span className="font-medium">{membership.company.name}</span>
              {membership.company.city && <span className="text-muted">· {membership.company.city}</span>}
            </Link>
            {/* "Bedrijf wijzigen" (koppelen aan een ándere werkgever) stond
                hier als enige actie naast "Werkzaam bij X", wat de indruk
                wekte dat het naar de bedrijfsgegevens zou leiden. Die link
                gaat daar wél direct naartoe, en staat verderop op de pagina
                (zie onder ProfileForm) — wisselen van werkgever is zeldzaam,
                dus hoeft hier niet naast de dagelijkse actie te staan. Subtiele
                tekstlink i.p.v. knop — dit is een snelkoppeling, geen
                hoofdactie van deze pagina. */}
            <Link
              href={companyHref(membership.company, "/bewerken")}
              className="flex items-center gap-1 text-xs text-muted hover:text-petrol"
            >
              <Pencil size={11} />
              Bedrijfsgegevens bewerken
            </Link>
          </div>
          {/* F1: de huidige koppeling blijft bewust staan terwijl een
              aanvraag voor een ander (bestaand) bedrijf nog in behandeling
              is — pas bij goedkeuring wisselt het systeem over. */}
          {pendingRequest?.company && (
            <p className="flex items-center gap-2 text-xs text-muted">
              <Clock size={13} />
              Aanvraag voor <span className="font-medium text-foreground">{pendingRequest.company.name}</span> in
              behandeling
            </p>
          )}
        </div>
      ) : pendingRequest?.company ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface px-4 py-3 shadow-sm">
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

      <div className="rounded-2xl bg-surface p-6 shadow-sm">
        <ProfileForm profile={profile} avatarUrl={avatarUrl} coverUrl={coverUrl} />
      </div>

      {membership?.company && (
        <div className="flex justify-center">
          <CompanyMembershipForm hasCompany />
        </div>
      )}
    </div>
  );
}
