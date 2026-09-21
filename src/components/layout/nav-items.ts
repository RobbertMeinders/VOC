import type { LucideIcon } from "lucide-react";
import { Bell, Building2, CalendarDays, FileText, Home, LayoutDashboard, MessageCircle, Search, Users } from "lucide-react";
import type { UnreadNotificationSections } from "@/lib/notifications/useUnreadCount";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  // Voor items die meerdere routes bestrijken (zoals "Netwerk", dat zowel
  // /leden als /bedrijven dekt) — zonder deze is het gewoon een
  // prefix-match op href.
  activeMatch?: (pathname: string) => boolean;
  // Koppelt dit item aan een sectie van ongelezen-notificatie-aantallen
  // (zie useUnreadNotificationCount), voor het badge-getal op het item zelf.
  badgeKey?: keyof UnreadNotificationSections;
};

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.activeMatch) return item.activeMatch(pathname);
  return item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
}

export const HOME_NAV_ITEM: NavItem = { href: "/", label: "Home", icon: Home };
export const COMMUNITY_NAV_ITEM: NavItem = { href: "/community", label: "Community", icon: MessageCircle };
export const AGENDA_NAV_ITEM: NavItem = { href: "/agenda", label: "Agenda", icon: CalendarDays, badgeKey: "agenda" };
export const LEDEN_NAV_ITEM: NavItem = { href: "/leden", label: "Leden", icon: Users };
export const BEDRIJVEN_NAV_ITEM: NavItem = { href: "/bedrijven", label: "Bedrijven", icon: Building2 };

// Leden en bedrijven zijn allebei "wie zit er in het netwerk" — op mobiel is
// dit een enkel nav-item dat eerst een Bedrijven/Leden-keuze toont
// (NetworkChooser); op desktop is het de enige sidebar-ingang die uitklapt
// naar twee subitems (Sidebar.tsx). De bestaande tab-switch op de leden- en
// bedrijvenpagina's zelf (NetworkTabs) blijft daarnaast gewoon bestaan.
export const NETWERK_NAV_ITEM: NavItem = {
  href: "/leden",
  label: "Netwerk",
  icon: Users,
  activeMatch: (pathname) => pathname.startsWith("/leden") || pathname.startsWith("/bedrijven"),
  badgeKey: "netwerk",
};

export const DOCUMENTEN_NAV_ITEM: NavItem = { href: "/documenten", label: "Documenten", icon: FileText };
export const ZOEKEN_NAV_ITEM: NavItem = { href: "/zoeken", label: "Zoeken", icon: Search };
export const NOTIFICATIES_NAV_ITEM: NavItem = { href: "/notificaties", label: "Notificaties", icon: Bell, badgeKey: "total" };
export const BEHEER_NAV_ITEM: NavItem = { href: "/beheer", label: "Beheer", icon: LayoutDashboard, badgeKey: "beheer" };

// Mobiele bottom nav: precies 4 hoofditems. Netwerk tikken opent eerst een
// keuze (Bedrijven | Leden) i.p.v. direct te navigeren — zie BottomNav.tsx.
export const MOBILE_PRIMARY_NAV_ITEMS: NavItem[] = [
  HOME_NAV_ITEM,
  COMMUNITY_NAV_ITEM,
  AGENDA_NAV_ITEM,
  NETWERK_NAV_ITEM,
];

// Desktop sidebar: platte lijst, Netwerk krijgt in Sidebar.tsx zelf zijn
// altijd-zichtbare Leden/Bedrijven-subitems.
export const DESKTOP_NAV_ITEMS: NavItem[] = [
  HOME_NAV_ITEM,
  COMMUNITY_NAV_ITEM,
  AGENDA_NAV_ITEM,
  NETWERK_NAV_ITEM,
  DOCUMENTEN_NAV_ITEM,
  ZOEKEN_NAV_ITEM,
  NOTIFICATIES_NAV_ITEM,
];

// "Profiel" is bewust geen eigen nav-item: dat, "mijn bedrijfsprofiel",
// "Instellingen" en (indien geautoriseerd) "Beheer" zijn bereikbaar via het
// accountmenu (profielkaart in de sidebar / profielicoon rechtsboven op
// mobiel) — zie ProfileMenu.tsx.
