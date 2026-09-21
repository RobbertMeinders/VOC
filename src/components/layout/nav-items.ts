import type { LucideIcon } from "lucide-react";
import { CalendarDays, FileText, Home, Search, Users } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  // Voor items die meerdere routes bestrijken (zoals "Netwerk", dat zowel
  // /leden als /bedrijven dekt) — zonder deze is het gewoon een
  // prefix-match op href.
  activeMatch?: (pathname: string) => boolean;
};

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.activeMatch) return item.activeMatch(pathname);
  return item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
}

// Leden en bedrijven zijn allebei "wie zit er in het netwerk" — daarom één
// gezamenlijke nav-ingang (met tabs op de pagina's zelf, zie NetworkTabs)
// in plaats van twee losse items waarvan er dan altijd één de indruk wekt
// minder belangrijk te zijn dan de ander.
export const NETWERK_NAV_ITEM: NavItem = {
  href: "/leden",
  label: "Netwerk",
  icon: Users,
  activeMatch: (pathname) => pathname.startsWith("/leden") || pathname.startsWith("/bedrijven"),
};

// Dezelfde primaire set op mobiel én desktop, zodat de twee niet meer
// uiteenlopen: bottom-nav (mobiel, + de profielmenu-knop als 4e slot) toont
// exact dezelfde 3 items als bovenaan de desktop-sidebar.
export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  NETWERK_NAV_ITEM,
];

export const DOCUMENTEN_NAV_ITEM: NavItem = { href: "/documenten", label: "Documenten", icon: FileText };
export const ZOEKEN_NAV_ITEM: NavItem = { href: "/zoeken", label: "Zoeken", icon: Search };

// Secundaire set, óók consistent op beide platformen: op mobiel het
// hamburgermenu, op desktop een apart, visueel gescheiden "Meer"-blokje
// onderaan de primaire lijst in de sidebar.
export const SECONDARY_NAV_ITEMS: NavItem[] = [DOCUMENTEN_NAV_ITEM, ZOEKEN_NAV_ITEM];

// "Profiel" is bewust geen eigen nav-item: dat, "mijn bedrijfsprofiel" en
// "Instellingen" zijn bereikbaar via het profielmenu (avatar-kaart in de
// sidebar / profielknop in de bottom nav).
