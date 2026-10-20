import Link from "next/link";
import { UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { Avatar } from "@/components/ui/Avatar";
import { ComingSoon } from "@/components/ui/ComingSoon";

type BoardPositionRow = {
  id: string;
  title: string;
  started_at: string;
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    avatar_thumb_url: string | null;
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

// Wordt letterlijk hetzelfde gebouwd en getoond op zowel /beheer/vereniging/
// bestuur (beheer) als /vereniging/bestuur (leden) — alleen de pagina
// eromheen (kop, eventuele beheerlink) verschilt. Toont uitsluitend
// board_positions zonder ended_at: beëindigde aanstellingen verdwijnen
// hiermee vanzelf, zonder dat deze component zelf "huidig" hoeft te bepalen.
export async function BestuurContent() {
  const supabase = await createClient();

  const { data: positions } = await supabase
    .from("board_positions")
    .select(
      "id, title, started_at, profile:profiles!board_positions_profile_id_fkey(id, first_name, last_name, avatar_url, avatar_thumb_url)"
    )
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

  const avatarUrls = await getSignedStorageUrls(
    supabase,
    "avatars",
    activePositions.flatMap((p) => [p.profile?.avatar_url, p.profile?.avatar_thumb_url])
  );

  return (
    // flex-wrap + justify-center i.p.v. een vast grid: bij een niet-rond
    // aantal bestuursleden (bv. 5) laat een grid de laatste rij links
    // "verweesd" achter — hiermee centreert die laatste rij juist. Afwerkronde
    // blok 6: kaartbreedte nu per breakpoint berekend (2/3/4 per rij i.p.v.
    // een vaste w-40/w-48) zodat de rij de beschikbare breedte opvult i.p.v.
    // ruimte over te laten. Stijlronde: op mobiel weer onder elkaar (volle
    // breedte, 1 per rij) i.p.v. 2 per rij — dat voelde te gedrongen.
    <div className="flex flex-wrap justify-center gap-4">
      {activePositions.map(({ id, title, profile }) => {
        if (!profile) return null;
        const path = profile.avatar_thumb_url ?? profile.avatar_url;
        const avatarUrl = path ? (avatarUrls.get(path) ?? null) : null;
        const companyName = companyByProfile.get(profile.id);
        return (
          <Link
            key={id}
            href={`/leden/${profile.id}`}
            // animate-rise-in + een lichte hover-lift (i.p.v. alleen de
            // randkleur) geven de kennismakingspagina wat meer leven dan een
            // statische kaart — zelfde soort micro-interactie als elders in
            // de app (bv. de sidebar-items die bij hover opschuiven).
            className="card-hover-lift animate-rise-in group flex w-full flex-col items-center gap-3 rounded-2xl bg-surface px-4 py-6 text-center shadow-sm hover:border-foreground/20 sm:w-[calc(50%-0.5rem)] md:w-[calc(33.333%-0.667rem)] lg:w-[calc(25%-0.75rem)]"
          >
            <Avatar
              firstName={profile.first_name}
              lastName={profile.last_name}
              avatarUrl={avatarUrl}
              size={64}
              shape="square"
              quality={90}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {profile.first_name} {profile.last_name}
              </p>
              {/* Stijlronde: nadruk op de functie (zelf foreground i.p.v.
                  muted), meer ruimte naar het bedrijf erna. Bedrijfsnaam mag
                  omlopen i.p.v. af te kappen — geen truncate meer, anders
                  verdwijnt een lange naam gedeeltelijk uit beeld. "Sinds
                  ..." weg: de datum klopte niet. */}
              <p className="mt-1 truncate text-xs font-medium text-foreground">{title}</p>
              {companyName && <p className="mt-1.5 text-xs text-muted">{companyName}</p>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
