import Link from "next/link";
import type { ReactNode } from "react";
import { Pencil } from "lucide-react";
import { StatusPill, type StatusTone } from "@/components/ui/StatusPill";

export type HeroPill = { label: ReactNode; tone?: StatusTone };

// Profielhero-herontwerp: gedeelde banner+hero+pillenrij voor zowel de
// bedrijfs- als de ledenpagina. Zonder coverUrl blijft de gebrande
// petrol-gradient staan (zie supabase/migrations/0183_profile_hero_cover_photos.sql
// — cover_url is puur additief, nooit verplicht); met coverUrl wordt die foto
// getoond onder een donkere overlay zodat de witte eyebrow/naam altijd
// leesbaar blijft. `.gradient-rule` (globals.css) is het bestaande
// petrol->rood lijntje uit Identiteit Fase 2, hier onder de banner i.p.v.
// onder de kopbalk/PageHeader.
export function ProfileHero({
  eyebrow,
  name,
  subtitle,
  coverUrl,
  avatar,
  editHref,
  editLabel = "Bewerken",
  pills = [],
}: {
  eyebrow: string;
  name: string;
  subtitle?: string | null;
  coverUrl?: string | null;
  avatar: ReactNode;
  editHref?: string;
  editLabel?: string;
  pills?: HeroPill[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-sm">
      <div
        className="h-28 bg-gradient-to-br from-petrol-deep to-petrol bg-cover bg-center"
        style={
          coverUrl
            ? { backgroundImage: `linear-gradient(120deg, rgba(11,46,51,.55), rgba(14,90,99,.25)), url(${coverUrl})` }
            : undefined
        }
      />
      <div className="gradient-rule" />
      <div className="px-5 pb-5 sm:px-6">
        <div className="-mt-9 flex items-end gap-4">
          <div className="shrink-0">{avatar}</div>
          <div className="min-w-0 flex-1 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-danger-text">{eyebrow}</p>
            <h1 className="truncate font-display text-[1.375rem] font-extrabold tracking-[-0.02em] text-foreground sm:text-[1.5rem]">
              {name}
            </h1>
            {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
          </div>
          {editHref && (
            <>
              {/* Zelfde mobiel/desktop-knopsplitsing als de oude CompanyHeader/
                  MemberProfileContent-koppen: op mobiel alleen het potloodje. */}
              <Link
                href={editHref}
                aria-label={editLabel}
                className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:border-muted sm:hidden"
              >
                <Pencil size={14} />
              </Link>
              <Link
                href={editHref}
                className="mb-1 hidden shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-muted sm:flex"
              >
                <Pencil size={14} />
                {editLabel}
              </Link>
            </>
          )}
        </div>
        {pills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {pills.map((pill, i) => (
              <StatusPill key={i} tone={pill.tone ?? "neutral"}>
                {pill.label}
              </StatusPill>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Grid i.p.v. losse flex-kolommen: 1.55fr/1fr op desktop (inhoud krijgt meer
// ruimte dan de vaste zijbalk), één kolom op mobiel — zelfde breakpoint-
// gedachte als de rest van de app (sm/lg), hier op lg zodat de zijbalk niet
// al op tablet-breedte te smal knijpt.
export function ProfileColumns({ main, sidebar }: { main: ReactNode; sidebar: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
      <div className="flex flex-col gap-4">{main}</div>
      <div className="flex flex-col gap-4">{sidebar}</div>
    </div>
  );
}
