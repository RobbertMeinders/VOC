import type { LucideIcon } from "lucide-react";
import { Building2, CalendarDays, FileText, Home, Users } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// Mobile bottom bar: 3 plain nav items + the profile-menu trigger (see
// BottomNav.tsx), which replaces what used to be a 4th "Profiel" link.
export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/leden", label: "Leden", icon: Users },
];

// Bedrijven and Documenten don't fit the four-item mobile bottom bar, so
// they're reached via the desktop sidebar and the mobile hamburger menu.
export const BEDRIJVEN_NAV_ITEM: NavItem = { href: "/bedrijven", label: "Bedrijven", icon: Building2 };
export const DOCUMENTEN_NAV_ITEM: NavItem = { href: "/documenten", label: "Documenten", icon: FileText };

// "Profiel" is bewust geen eigen nav-item meer: dat, "mijn bedrijfsprofiel"
// en "Instellingen" zijn nu allemaal bereikbaar via het profielmenu
// (avatar-kaart in de sidebar / profielknop in de bottom nav).
export const SIDEBAR_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/leden", label: "Leden", icon: Users },
  BEDRIJVEN_NAV_ITEM,
  DOCUMENTEN_NAV_ITEM,
];
