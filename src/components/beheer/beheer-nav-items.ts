import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  FileText,
  Flag,
  Globe,
  Handshake,
  Inbox,
  LayoutDashboard,
  Mail,
  Megaphone,
  Newspaper,
  SlidersHorizontal,
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
// Vijf secties. "Vereniging" (identiteit, "Over de VOC"-inhoud,
// bestuur, commissies) staat niet meer als eigen sectie, maar als item onder
// "Instellingen", samen met Portaalinstellingen — allebei verenigings-/
// portaalbrede instellingen i.p.v. dagelijks contentwerk, dus horen ze
// inhoudelijk bij elkaar. "Leden & bedrijven" staat direct na Overzicht (de
// twee overzichten, gevolgd door de acties daaromheen).
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
      { href: "/beheer/instroom", label: "Aanvragen", icon: Inbox },
    ],
  },
  {
    title: "Communicatie",
    items: [
      { href: "/beheer/communicatie", label: "Nieuwsbrieven", icon: Mail },
      { href: "/beheer/email-templates", label: "E-mailteksten", icon: FileText, adminOnly: true },
      { href: "/beheer/notificaties", label: "Verzonden meldingen", icon: Bell },
      { href: "/beheer/pushbericht", label: "Pushbericht", icon: Megaphone, adminOnly: true },
    ],
  },
  {
    // UX-review U10: geen eigen "Documenten"-item meer hier — die pagina was
    // een letterlijke kopie van /documenten (zelfde upload-/beheerknoppen,
    // al zichtbaar voor bestuur/beheer in die context), zonder mappen,
    // downloadstatistiek of bulkacties die een apart beheerscherm zouden
    // rechtvaardigen. Eén item bewerk je in context; dat is hier /documenten
    // zelf.
    title: "Inhoud",
    items: [
      { href: "/beheer/nieuws", label: "Nieuws", icon: Newspaper },
      { href: "/beheer/agenda", label: "Activiteiten", icon: CalendarDays },
      { href: "/beheer/rapportages", label: "Gemelde berichten", icon: Flag },
    ],
  },
  {
    title: "Instellingen",
    items: [
      { href: "/beheer/vereniging", label: "Vereniging", icon: Handshake },
      { href: "/beheer/instellingen", label: "Portaalinstellingen", icon: SlidersHorizontal, adminOnly: true },
      { href: "/beheer/embed-codes", label: "Website-koppeling", icon: Globe, adminOnly: true },
    ],
  },
];
