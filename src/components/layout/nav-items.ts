import type { LucideIcon } from "lucide-react";
import { Building2, CalendarDays, FileText, Home, Search, Users } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// Dezelfde primaire set op mobiel én desktop, zodat de twee niet meer
// uiteenlopen: bottom-nav (mobiel, + de profielmenu-knop als 4e slot) toont
// exact dezelfde 3 items als bovenaan de desktop-sidebar.
export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/leden", label: "Leden", icon: Users },
];

export const BEDRIJVEN_NAV_ITEM: NavItem = { href: "/bedrijven", label: "Bedrijven", icon: Building2 };
export const DOCUMENTEN_NAV_ITEM: NavItem = { href: "/documenten", label: "Documenten", icon: FileText };
export const ZOEKEN_NAV_ITEM: NavItem = { href: "/zoeken", label: "Zoeken", icon: Search };

// Secundaire set, óók consistent op beide platformen: op mobiel het
// hamburgermenu, op desktop een apart, visueel gescheiden "Meer"-blokje
// onderaan de primaire lijst in de sidebar.
export const SECONDARY_NAV_ITEMS: NavItem[] = [BEDRIJVEN_NAV_ITEM, DOCUMENTEN_NAV_ITEM, ZOEKEN_NAV_ITEM];

// "Profiel" is bewust geen eigen nav-item: dat, "mijn bedrijfsprofiel" en
// "Instellingen" zijn bereikbaar via het profielmenu (avatar-kaart in de
// sidebar / profielknop in de bottom nav).
