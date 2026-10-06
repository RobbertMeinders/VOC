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
  Megaphone,
  Newspaper,
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
//
// Zes secties met in totaal drie secties van maar één item (Overzicht,
// Statistieken, Openbare website) voegden alleen koppen toe zonder iets te
// groeperen — samengevoegd tot vier secties, elk met een duidelijk eigen
// onderwerp. "Leden & bedrijven" begint nu met de twee overzichten (Leden,
// Bedrijven) gevolgd door de acties daaromheen, i.p.v. een willekeurige
// volgorde.
export const BEHEER_SECTIONS: BeheerNavSection[] = [
  {
    title: "Overzicht",
    items: [
      { href: "/beheer", label: "Dashboard", icon: LayoutDashboard },
      { href: "/beheer/statistieken", label: "Statistieken", icon: BarChart3 },
    ],
  },
  {
    title: "Communicatie",
    items: [
      { href: "/beheer/communicatie", label: "Campagnes", icon: Megaphone },
      { href: "/beheer/pushbericht", label: "Handmatig pushbericht", icon: Send },
      { href: "/beheer/notificaties", label: "Notificaties", icon: Bell },
      { href: "/beheer/email-templates", label: "E-mailtemplates", icon: Mail },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/beheer/nieuws", label: "Nieuws", icon: Newspaper },
      { href: "/beheer/agenda", label: "Activiteiten", icon: CalendarDays },
      { href: "/beheer/documenten", label: "Documenten", icon: FileText },
      { href: "/beheer/rapportages", label: "Rapportages", icon: Flag },
      { href: "/beheer/embed-codes", label: "Embed-codes", icon: Code },
    ],
  },
  {
    title: "Leden & bedrijven",
    items: [
      { href: "/beheer/leden", label: "Leden", icon: Users },
      { href: "/beheer/bedrijven", label: "Bedrijven", icon: Building2 },
      { href: "/beheer/uitnodigingen", label: "Uitnodigingen", icon: UserPlus },
      { href: "/beheer/aanvragen", label: "Toegangsaanvragen", icon: Inbox },
      { href: "/beheer/prospects", label: "Potentiële leden", icon: UserSearch },
      { href: "/beheer/leden-import", label: "Leden importeren", icon: Upload },
    ],
  },
];
