import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Code,
  Flag,
  Info,
  LayoutDashboard,
  Mail,
  Megaphone,
  Newspaper,
  Send,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";

// adminOnly ontbreekt (= false) voor inhoudelijk-beheer-items (bestuurslid +
// beheerder); adminOnly: true voor systeembrede/technische items die alleen
// een beheerder mag zien — BeheerSidebar filtert hierop (en laat een sectie
// die daardoor helemaal leeg valt, zoals "Systeem" voor een bestuurslid,
// gewoon weg).
export type BeheerNavItem = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean };
export type BeheerNavSection = { title: string; items: BeheerNavItem[] };

// Eén bron voor de Beheer-navigatie (BeheerSidebar) — voorheen stond dit als
// kaartjes-grid alleen op /beheer zelf, waardoor je na het openen van een
// sectie weer helemaal terug moest om iets anders te kiezen. Nu een
// permanent zij-menu, net als de hoofdnavigatie zelf.
//
// Vijf secties. "Vereniging" (identiteit, "Over de vereniging"-inhoud,
// bestuur, commissies) staat niet meer als eigen sectie, maar als item onder
// "Systeem & integraties", samen met Portaalinstellingen — allebei
// verenigings-/portaalbrede instellingen i.p.v. dagelijks contentwerk, dus
// horen ze inhoudelijk bij elkaar. "Leden & bedrijven" staat direct na
// Overzicht (de twee overzichten, gevolgd door de acties daaromheen).
export const BEHEER_SECTIONS: BeheerNavSection[] = [
  {
    title: "Overzicht",
    items: [
      { href: "/beheer", label: "Dashboard", icon: LayoutDashboard },
      { href: "/beheer/statistieken", label: "Statistieken", icon: BarChart3 },
    ],
  },
  {
    title: "Leden & bedrijven",
    items: [
      { href: "/beheer/leden", label: "Leden", icon: Users },
      { href: "/beheer/bedrijven", label: "Bedrijven", icon: Building2 },
      { href: "/beheer/instroom", label: "Instroom", icon: UserPlus },
    ],
  },
  {
    title: "Communicatie",
    items: [
      { href: "/beheer/communicatie", label: "Nieuwsbrieven", icon: Megaphone },
      { href: "/beheer/email-templates", label: "E-mailtemplates", icon: Mail, adminOnly: true },
      { href: "/beheer/notificaties", label: "Verzonden meldingen", icon: Bell },
      { href: "/beheer/pushbericht", label: "Handmatig pushbericht", icon: Send, adminOnly: true },
    ],
  },
  {
    // UX-review U10: geen eigen "Documenten"-item meer hier — die pagina was
    // een letterlijke kopie van /documenten (zelfde upload-/beheerknoppen,
    // al zichtbaar voor bestuur/beheer in die context), zonder mappen,
    // downloadstatistiek of bulkacties die een apart beheerscherm zouden
    // rechtvaardigen. Eén item bewerk je in context; dat is hier /documenten
    // zelf.
    title: "Content & activiteiten",
    items: [
      { href: "/beheer/nieuws", label: "Nieuws", icon: Newspaper },
      { href: "/beheer/agenda", label: "Activiteiten", icon: CalendarDays },
      { href: "/beheer/rapportages", label: "Moderatie", icon: Flag },
    ],
  },
  {
    title: "Systeem & integraties",
    items: [
      { href: "/beheer/vereniging", label: "Vereniging", icon: Info },
      { href: "/beheer/instellingen", label: "Portaalinstellingen", icon: Settings, adminOnly: true },
      { href: "/beheer/embed-codes", label: "Code voor de website", icon: Code, adminOnly: true },
    ],
  },
];
