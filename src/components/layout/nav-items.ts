import type { LucideIcon } from "lucide-react";
import { Building2, CalendarDays, Home, LayoutDashboard, MessagesSquare, Search, Users } from "lucide-react";
import type { UnreadNotificationSections } from "@/lib/notifications/useUnreadCount";

// Eigen profiel/bedrijf (via "Mijn profiel"/"Mijn bedrijfsprofiel" in het
// accountmenu) hergebruiken dezelfde /leden/[id]- en /bedrijven/[id]-routes
// als Netwerk → Leden/Bedrijven — zonder deze context zou "Netwerk" dus
// altijd meelichten op je eigen profiel/bedrijfspagina, ook al kwam je daar
// via het accountmenu. Alleen activeMatch-functies die dit onderscheid nodig
// hebben (zoals NETWERK_NAV_ITEM) lezen deze context uit.
export type NavActiveContext = {
  ownProfileSlug?: string;
  ownCompanySlug?: string | null;
};

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  // Voor items die meerdere routes bestrijken (zoals "Netwerk", dat zowel
  // /leden als /bedrijven dekt) — zonder deze is het gewoon een
  // prefix-match op href.
  activeMatch?: (pathname: string, ctx: NavActiveContext) => boolean;
  // Koppelt dit item aan een sectie van ongelezen-notificatie-aantallen
  // (zie useUnreadNotificationCount), voor het badge-getal op het item zelf.
  badgeKey?: keyof UnreadNotificationSections;
  // Waar dat getal over gaat, voor de hover-tooltip op de badge (UX-review
  // U9) — een los getal legt zichzelf niet uit.
  badgeLabel?: string;
};

export function isNavItemActive(item: NavItem, pathname: string, ctx: NavActiveContext = {}): boolean {
  if (item.activeMatch) return item.activeMatch(pathname, ctx);
  return item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
}

export const HOME_NAV_ITEM: NavItem = { href: "/", label: "Home", icon: Home };
export const COMMUNITY_NAV_ITEM: NavItem = { href: "/community", label: "Community", icon: MessagesSquare };
export const AGENDA_NAV_ITEM: NavItem = {
  href: "/agenda",
  label: "Agenda",
  icon: CalendarDays,
  badgeKey: "agenda",
  badgeLabel: "ongelezen melding(en) over de agenda",
};
export const LEDEN_NAV_ITEM: NavItem = { href: "/leden", label: "Leden", icon: Users };
export const BEDRIJVEN_NAV_ITEM: NavItem = { href: "/bedrijven", label: "Bedrijven", icon: Building2 };

// Leden en bedrijven zijn allebei "wie zit er in het netwerk" — "Netwerk"
// navigeert direct naar /leden (review-bevinding U3: drie verschillende
// mechanismen voor dezelfde keuze was verwarrend), de tab-switch op de
// leden- en bedrijvenpagina's zelf (NetworkTabs) doet de rest.
//
// UX-review C3: had ook een badgeKey ("netwerk"), maar die telling zakt
// alleen als je de onderliggende melding zelf als gelezen markeert (via de
// bel/notificatielijst) — gewoon naar /leden navigeren liet het rode getal
// onveranderd staan, terwijl de bel zelf al hetzelfde (en wél klikkende)
// totaal toonde. Twee tellers voor dezelfde meldingen, waarvan één nooit
// leeg leek te raken — weggehaald i.p.v. apart bij te houden "al bezocht".
export const NETWERK_NAV_ITEM: NavItem = {
  href: "/leden",
  label: "Netwerk",
  icon: Users,
  activeMatch: (pathname, ctx) => {
    // Eigen profiel/bedrijf telt niet als "via Netwerk bereikt" — zie
    // NavActiveContext hierboven — anders licht dit altijd mee op
    // /leden/[eigen-id] en /bedrijven/[eigen-bedrijf-id].
    if (ctx.ownProfileSlug && pathname.startsWith(`/leden/${ctx.ownProfileSlug}`)) return false;
    if (ctx.ownCompanySlug && pathname.startsWith(`/bedrijven/${ctx.ownCompanySlug}`)) return false;
    return pathname.startsWith("/leden") || pathname.startsWith("/bedrijven");
  },
};

export const ZOEKEN_NAV_ITEM: NavItem = { href: "/zoeken", label: "Zoeken", icon: Search };
export const BEHEER_NAV_ITEM: NavItem = { href: "/beheer", label: "Beheer", icon: LayoutDashboard, badgeKey: "beheer" };

// Mobiele bottom nav: precies 4 hoofditems.
export const MOBILE_PRIMARY_NAV_ITEMS: NavItem[] = [
  HOME_NAV_ITEM,
  AGENDA_NAV_ITEM,
  COMMUNITY_NAV_ITEM,
  NETWERK_NAV_ITEM,
];

// Desktop sidebar: platte lijst. Zoeken en Notificaties zitten niet in deze
// lijst maar als compacte icoontjes naast het logo (net als Zoeken al op
// mobiel deed) — allebei een snel-in-en-uit-popover i.p.v. een echte
// navigatiebestemming, dus dat verdient geen even brede rij als de rest van
// het menu. Documenten staat niet meer los in deze lijst: dat item is
// vervangen door de Vereniging-dropdown (zie VerenigingMenu.tsx), die naast
// Over de VOC/Bestuur/Commissies ook naar /documenten linkt.
export const DESKTOP_NAV_ITEMS: NavItem[] = [HOME_NAV_ITEM, AGENDA_NAV_ITEM, COMMUNITY_NAV_ITEM, NETWERK_NAV_ITEM];

// "Profiel" is bewust geen eigen nav-item: dat, "mijn bedrijfsprofiel",
// "Instellingen" en (indien geautoriseerd) "Beheer" zijn bereikbaar via het
// accountmenu (profielkaart in de sidebar / profielicoon rechtsboven op
// mobiel) — zie ProfileMenu.tsx.
