import type { LucideIcon } from "lucide-react";
import { Building2, CalendarDays, Home, User, Users } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// Mobile bottom bar: capped at four items to stay usable on a small screen.
export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/leden", label: "Leden", icon: Users },
  { href: "/profiel", label: "Profiel", icon: User },
];

// Bedrijven doesn't fit the four-item mobile bottom bar, so it's reached via
// the desktop sidebar (inserted after Leden) and the mobile hamburger menu.
export const BEDRIJVEN_NAV_ITEM: NavItem = { href: "/bedrijven", label: "Bedrijven", icon: Building2 };

export const SIDEBAR_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/leden", label: "Leden", icon: Users },
  BEDRIJVEN_NAV_ITEM,
  { href: "/profiel", label: "Profiel", icon: User },
];
