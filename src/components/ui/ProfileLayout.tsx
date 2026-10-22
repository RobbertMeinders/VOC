import Link from "next/link";
import type { ReactNode } from "react";
import { Pencil } from "lucide-react";
import { StatusPill, type StatusTone } from "@/components/ui/StatusPill";

export type HeroPill = { label: ReactNode; tone?: StatusTone };

// Profielhero-herontwerp: gedeelde banner+hero+pillenrij voor zowel de
// bedrijfs- als de ledenpagina. Zonder coverUrl blijft de gebrande
// petrol-gradient staan (zie supabase/migrations/0183_profile_hero_cover_photos.sql
// — cover_url is puur additief, nooit verplicht); met coverUrl wordt die foto
// in haar eigen kleuren getoond, zonder donkere overlay (de naam staat niet
// meer op de banner, dus er is niets meer dat op de banner leesbaar moet
// blijven). `.gradient-rule` (globals.css) is het bestaande petrol->rood
// lijntje uit Identiteit Fase 2, hier onder de banner i.p.v. onder de
// kopbalk/PageHeader.
export function ProfileHero({
  name,
  subtitle,
  coverUrl,
  avatar,
  editHref,
  editLabel = "Bewerken",
  pills = [],
}: {
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
        style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
      />
      <div className="gradient-rule" />
      {/* Hero-fix: eerder lag de hele naam/tekst-rij met een negative margin
          over de banner heen (onleesbaar op petrol/een foto). Nu schuift
          alleen het avatar/logo (losse wrapper, eigen -mt) half over de
          banner heen — gangbaar voor dit soort banners — terwijl de
          naam/tekst-kolom op zijn normale, niet-verschoven positie blijft:
          die begint dus altijd op of na de onderrand van de banner, nooit
          erboven. */}
      <div className="px-5 pb-5 sm:px-6">
        <div className="flex items-start gap-4">
          <div className="-mt-10 shrink-0">{avatar}</div>
          <div className="min-w-0 flex-1 pt-3">
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
                className="mt-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:border-muted sm:hidden"
              >
                <Pencil size={14} />
              </Link>
              <Link
                href={editHref}
                className="mt-3 hidden shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-muted sm:flex"
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
//
// Hero-fix (lege-kolom-bug): bij een bedrijf/lid met weinig content (geen
// omschrijving/bio, geen teamleden/activiteiten) was de hoofdkolom leeg en
// hing de zijbalk eenzaam rechts, met een scheve grid als gevolg. De aanroeper
// berekent zelf of de hoofdkolom écht iets toont (`hasMain`) — een ReactNode
// zelf is daar niet op te inspecteren. Zonder hoofdinhoud vervalt de grid en
// komt de zijbalk gewoon in de normale, volle-breedte kolomstroom terecht
// i.p.v. in een smalle kolom aan de rechterrand.
export function ProfileColumns({
  main,
  sidebar,
  hasMain = true,
}: {
  main: ReactNode;
  sidebar: ReactNode;
  hasMain?: boolean;
}) {
  if (!hasMain) {
    return (
      <div className="flex flex-col gap-4">
        {main}
        {sidebar}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
      <div className="flex flex-col gap-4">{main}</div>
      <div className="flex flex-col gap-4">{sidebar}</div>
    </div>
  );
}
