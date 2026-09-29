import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Code,
  FileText,
  Flag,
  Inbox,
  LayoutDashboard,
  Mail,
  Send,
  Upload,
  UserPlus,
  Users,
  UserSearch,
} from "lucide-react";

export type BeheerNavItem = { href: string; label: string; icon: LucideIcon };
export type BeheerNavSection = { title: string; items: BeheerNavItem[] };

// Eén bron voor de Beheer-navigatie (BeheerSidebar) — voorheen stond dit als
// kaartjes-grid alleen op /beheer zelf, waardoor je na het openen van een
// sectie weer helemaal terug moest om iets anders te kiezen. Nu een
// permanent zij-menu, net als de hoofdnavigatie zelf.
export const BEHEER_SECTIONS: BeheerNavSection[] = [
  {
    title: "Overzicht",
    items: [{ href: "/beheer", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Leden & bedrijven",
    items: [
      { href: "/beheer/uitnodigingen", label: "Uitnodigingen", icon: UserPlus },
      { href: "/beheer/leden-import", label: "Leden importeren", icon: Upload },
      { href: "/beheer/aanvragen", label: "Toegangsaanvragen", icon: Inbox },
      { href: "/beheer/leden", label: "Leden", icon: Users },
      { href: "/beheer/bedrijven", label: "Bedrijven", icon: Building2 },
      { href: "/beheer/prospects", label: "Potentiële leden", icon: UserSearch },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/beheer/agenda", label: "Activiteiten", icon: CalendarDays },
      { href: "/beheer/documenten", label: "Documenten", icon: FileText },
      { href: "/beheer/rapportages", label: "Rapportages", icon: Flag },
    ],
  },
  {
    title: "Communicatie",
    items: [
      { href: "/beheer/notificaties", label: "Notificaties", icon: Bell },
      { href: "/beheer/email-templates", label: "E-mailtemplates", icon: Mail },
      { href: "/beheer/pushbericht", label: "Handmatig pushbericht", icon: Send },
    ],
  },
  {
    title: "Statistieken",
    items: [{ href: "/beheer/statistieken", label: "Statistieken", icon: BarChart3 }],
  },
  {
    title: "Openbare website",
    items: [{ href: "/beheer/embed-codes", label: "Embed-codes", icon: Code }],
  },
];
