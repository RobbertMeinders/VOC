import type { LucideIcon } from "lucide-react";
import { CalendarDays, Home, User, Users } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// Primary navigation, shown on both the mobile bottom bar and the desktop
// sidebar. Secondary destinations (documenten, uitnodigingen) only appear
// in the desktop sidebar / a profile menu to keep the mobile bar to the
// four items the spec calls out.
export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/leden", label: "Leden", icon: Users },
  { href: "/profiel", label: "Profiel", icon: User },
];
