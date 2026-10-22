import Image from "next/image";
import Link from "next/link";
import { UserCheck } from "lucide-react";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { memberHref } from "@/lib/members/slug";

type BoardPositionRow = {
  id: string;
  title: string;
  started_at: string;
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    slug: string;
    avatar_url: string | null;
  } | null;
};

type MembershipRow = { profile_id: string; is_primary: boolean; company: { name: string } | null };

// Vaste volgorde voor de drie kernfuncties — ongeacht wanneer iemand is
// aangesteld, hoort de voorzitter vooraan te staan, dan secretaris, dan
// penningmeester (gangbare verenigingsvolgorde). Overige functies (algemeen
// bestuurslid e.d.) blijven erachter, in hun oorspronkelijke started_at-volgorde.
const TITLE_ORDER = ["voorzitter", "secretaris", "penningmeester"];
function titleRank(title: string): number {
  const index = TITLE_ORDER.findIndex((t) => title.toLowerCase().includes(t));
  return index === -1 ? TITLE_ORDER.length : index;
}

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// Wordt letterlijk hetzelfde gebouwd en getoond op zowel /beheer/vereniging/
// bestuur (beheer) als /vereniging/bestuur (leden) — alleen de pagina
// eromheen (kop, eventuele beheerlink) verschilt. Toont uitsluitend
// board_positions zonder ended_at: beëindigde aanstellingen verdwijnen
// hiermee vanzelf, zonder dat deze component zelf "huidig" hoeft te bepalen.
export async function BestuurContent() {
  const supabase = await createClient();

  const { data: positions } = await supabase
    .from("board_positions")
    .select("id, title, started_at, profile:profiles!board_positions_profile_id_fkey(id, first_name, last_name, slug, avatar_url)")
    .is("ended_at", null)
    .order("started_at", { ascending: true })
    .returns<BoardPositionRow[]>();

  const activePositions = (positions ?? []).filter((p) => p.profile).sort((a, b) => titleRank(a.title) - titleRank(b.title));

  if (activePositions.length === 0) {
    return (
      <ComingSoon
        icon={UserCheck}
        title="Nog geen bestuur toegewezen"
        description="Zodra het bestuur bestuursfuncties toewijst via Beheer -> Leden, verschijnen die hier."
      />
    );
  }

  const { data: memberships } = await supabase
    .from("company_members")
    .select("profile_id, is_primary, company:companies(name)")
    .returns<MembershipRow[]>();

  const companyByProfile = new Map<string, string>();
  for (const membership of memberships ?? []) {
    if (!membership.company) continue;
    if (membership.is_primary || !companyByProfile.has(membership.profile_id)) {
      companyByProfile.set(membership.profile_id, membership.company.name);
    }
  }

  // Stijlronde (Bestuur-kaarten, "vijf op één rij"): de kaart toont nu een
  // staande foto op volledig formaat i.p.v. een kleine ronde avatar — de
  // eerder gebruikte avatar_thumb_url (max 160px breed) oogde daardoor wazig
  // op een tegel van ~180-200px. Gewoon de originele avatar_url, met next/
  // image's eigen sizes-gebaseerde optimalisatie voor de juiste resolutie.
  const avatarUrls = await Promise.all(
    activePositions.map((p) => getSignedStorageUrl("avatars", p.profile?.avatar_url ?? null))
  );

  return (
    // flex-wrap + justify-center i.p.v. een vast grid: bij een niet-rond
    // aantal bestuursleden laat een grid de laatste rij links "verweesd"
    // achter — flexbox justificeert elke gewrapte regel apart, dus een
    // oneven laatste kaart staat vanzelf gecentreerd, zonder aparte CSS
    // daarvoor. Kaartbreedte is vast (geen percentage) op sm+, zodat de rij
    // precies zoveel bestuursleden toont als er passen (vijf bij een
    // gangbare contentbreedte) en de rest doorloopt naar een volgende regel.
    // Op mobiel juist wél een percentage (2 per rij, zie card-tile hieronder).
    <div className="flex flex-wrap justify-center gap-4">
      {activePositions.map(({ id, title, profile }, index) => {
        if (!profile) return null;
        const avatarUrl = avatarUrls[index];
        const companyName = companyByProfile.get(profile.id);
        return (
          <Link
            key={id}
            href={memberHref(profile)}
            // animate-rise-in + een lichte hover-lift geven de
            // kennismakingspagina wat meer leven dan een statische kaart —
            // zelfde soort micro-interactie als elders in de app.
            className="card-hover-lift animate-rise-in group flex w-[calc(50%-0.5rem)] flex-col sm:w-[180px]"
          >
            {/* De foto is zelf de tegel (geen witte kaart eromheen): rounded-
                2xl + shadow-sm (--shadow-card), aspect-[3/4] zodat elke tegel
                — met foto of initialen — exact dezelfde hoogte heeft. */}
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl shadow-sm">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={`${profile.first_name} ${profile.last_name}`}
                  fill
                  sizes="(max-width: 640px) 45vw, 200px"
                  quality={90}
                  className="object-cover"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center"
                  style={{ backgroundImage: "linear-gradient(160deg, var(--petrol) 0%, var(--petrol-deep) 100%)" }}
                >
                  <span className="font-display text-6xl font-extrabold text-white/90 sm:text-7xl">
                    {initials(profile.first_name, profile.last_name)}
                  </span>
                </div>
              )}
            </div>

            {/* min-h-[2lh] houdt het rode streepje/naam/bedrijf van élke
                kaart op dezelfde hoogte, ongeacht of de functie op deze kaart
                op 1 of 2 regels staat (bv. "Algemeen bestuurslid"). */}
            <div className="mt-2.5 flex flex-col items-center text-center">
              <p className="flex min-h-[2lh] items-center font-display text-[15px] font-bold leading-tight tracking-[-0.02em] text-foreground sm:text-[18px]">
                {title}
              </p>
              <span aria-hidden className="my-1.5 h-[3px] w-7 shrink-0 rounded-full bg-voc-red" />
              <p className="text-sm font-semibold text-foreground">
                {profile.first_name} {profile.last_name}
              </p>
              {companyName && (
                <p
                  lang="nl"
                  className={clsx("mt-0.5 w-full text-[12.5px] text-muted", "[hyphens:auto] [overflow-wrap:break-word]")}
                >
                  {companyName}
                </p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
