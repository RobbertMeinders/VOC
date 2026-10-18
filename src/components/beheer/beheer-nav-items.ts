import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Code,
  Flag,
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
// Zes secties met in totaal drie secties van maar één item (Overzicht,
// Statistieken, Openbare website) voegden alleen koppen toe zonder iets te
// groeperen — samengevoegd tot vier secties, elk met een duidelijk eigen
// onderwerp. "Leden & bedrijven" begint nu met de twee overzichten (Leden,
// Bedrijven) gevolgd door de acties daaromheen, i.p.v. een willekeurige
// volgorde. "Systeem" is nieuw: alles wat systeembreed/technisch is
// (templates, een pushbroadcast die direct en ongefilterd iedereen bereikt,
// website-integraties, algemene app-instellingen) hoort bij de beheerder,
// niet bij inhoudelijk bestuurswerk.
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
      { href: "/beheer/communicatie", label: "Nieuwsbrieven", icon: Megaphone },
      { href: "/beheer/notificaties", label: "Verzonden meldingen", icon: Bell },
    ],
  },
  {
    // UX-review U10: geen eigen "Documenten"-item meer hier — die pagina was
    // een letterlijke kopie van /documenten (zelfde upload-/beheerknoppen,
    // al zichtbaar voor bestuur/beheer in die context), zonder mappen,
    // downloadstatistiek of bulkacties die een apart beheerscherm zouden
    // rechtvaardigen. Eén item bewerk je in context; dat is hier /documenten
    // zelf.
    title: "Content",
    items: [
      { href: "/beheer/nieuws", label: "Nieuws", icon: Newspaper },
      { href: "/beheer/agenda", label: "Activiteiten", icon: CalendarDays },
      { href: "/beheer/rapportages", label: "Moderatie", icon: Flag },
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
    title: "Systeem",
    items: [
      { href: "/beheer/instellingen", label: "App-instellingen", icon: Settings, adminOnly: true },
      { href: "/beheer/email-templates", label: "E-mailtemplates", icon: Mail, adminOnly: true },
      { href: "/beheer/pushbericht", label: "Handmatig pushbericht", icon: Send, adminOnly: true },
      { href: "/beheer/embed-codes", label: "Code voor de website", icon: Code, adminOnly: true },
    ],
  },
];
