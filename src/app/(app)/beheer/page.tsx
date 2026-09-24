import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  FileText,
  Flag,
  Inbox,
  Mail,
  Send,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Beheer" };

// Iemand telt als "online" zolang OnlineHeartbeat zijn tabblad recent nog
// heeft geping (elke 2 min bij een zichtbaar tabblad) — 5 min marge dekt
// een gemiste heartbeat door een korte netwerkhik of tabwissel.
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

const CARDS = [
  { href: "/beheer/uitnodigingen", label: "Uitnodigingen", icon: UserPlus, description: "Nodig nieuwe leden uit" },
  {
    href: "/beheer/leden-import",
    label: "Leden importeren",
    icon: Upload,
    description: "Bestaande ledengegevens in bulk toevoegen",
  },
  { href: "/beheer/aanvragen", label: "Toegangsaanvragen", icon: Inbox, description: "Beoordeel aanvragen van buitenaf" },
  { href: "/beheer/rapportages", label: "Rapportages", icon: Flag, description: "Gerapporteerde berichten uit de feed" },
  { href: "/beheer/leden", label: "Leden", icon: Users, description: "Profielen, rollen, activeren/deactiveren" },
  { href: "/beheer/bedrijven", label: "Bedrijven", icon: Building2, description: "Bedrijfsprofielen beheren" },
  { href: "/beheer/documenten", label: "Documenten", icon: FileText, description: "Uploaden en verwijderen" },
  { href: "/beheer/agenda", label: "Activiteiten", icon: CalendarDays, description: "Agenda beheren" },
];

const COMMUNICATIE_CARDS = [
  { href: "/beheer/notificaties", label: "Notificaties", icon: Bell, description: "Logboek van verzonden notificaties" },
  { href: "/beheer/email-templates", label: "E-mailtemplates", icon: Mail, description: "Inhoud van automatische mails/pushmeldingen" },
  { href: "/beheer/pushbericht", label: "Handmatig pushbericht", icon: Send, description: "Stuur direct een pushbericht naar alle abonnees" },
];

const STATISTIEKEN_CARDS = [
  { href: "/beheer/statistieken", label: "Statistieken", icon: BarChart3, description: "Leden, community, activiteiten en notificaties" },
];

export default async function BeheerPage() {
  await requireBoard();
  const supabase = await createClient();

  const [
    { count: memberCount },
    { count: companyCount },
    { count: pendingInvitations },
    { count: pendingRequests },
    { count: upcomingActivities },
    { count: pendingActivities },
    { count: openReports },
    { count: onlineCount },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("invitations").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("access_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .gte("starts_at", new Date().toISOString()),
    supabase.from("activities").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("feed_post_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .gte("last_active_at", new Date(new Date().getTime() - ONLINE_WINDOW_MS).toISOString()),
  ]);

  const stats = [
    { label: "Actieve leden", value: memberCount ?? 0 },
    { label: "Aantal bedrijven", value: companyCount ?? 0 },
    { label: "Leden nu online", value: onlineCount ?? 0 },
    { label: "Openstaande uitnodigingen", value: pendingInvitations ?? 0 },
    { label: "Openstaande aanvragen", value: pendingRequests ?? 0 },
    { label: "Aankomende activiteiten", value: upcomingActivities ?? 0 },
    { label: "Activiteiten ter goedkeuring", value: pendingActivities ?? 0 },
    { label: "Openstaande rapportages", value: openReports ?? 0 },
  ];

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-foreground">Beheer</h1>
      <p className="mb-6 text-sm text-muted">Overzicht voor bestuur en beheer.</p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <CardGrid cards={CARDS} />

      <h2 className="mb-3 mt-8 text-sm font-semibold text-foreground">Communicatie</h2>
      <CardGrid cards={COMMUNICATIE_CARDS} />

      <h2 className="mb-3 mt-8 text-sm font-semibold text-foreground">Statistieken</h2>
      <CardGrid cards={STATISTIEKEN_CARDS} />
    </div>
  );
}

function CardGrid({
  cards,
}: {
  cards: { href: string; label: string; icon: typeof Bell; description: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(({ href, label, icon: Icon, description }) => (
        <Link
          key={href}
          href={href}
          className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm hover:border-voc-red"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-voc-red-light text-voc-red">
            <Icon size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted">{description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
