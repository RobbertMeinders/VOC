import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CalendarDays, FileText, Inbox, Mail, Upload, UserPlus, Users } from "lucide-react";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Beheer" };

const CARDS = [
  { href: "/beheer/uitnodigingen", label: "Uitnodigingen", icon: UserPlus, description: "Nodig nieuwe leden uit" },
  {
    href: "/beheer/leden-import",
    label: "Leden importeren",
    icon: Upload,
    description: "Bestaande ledengegevens in bulk toevoegen",
  },
  { href: "/beheer/aanvragen", label: "Toegangsaanvragen", icon: Inbox, description: "Beoordeel aanvragen van buitenaf" },
  { href: "/beheer/email-templates", label: "E-mailtemplates", icon: Mail, description: "Inhoud van uitnodigings- en resetmails" },
  { href: "/leden", label: "Leden", icon: Users, description: "Profielen, rollen, activeren/deactiveren" },
  { href: "/bedrijven", label: "Bedrijven", icon: Building2, description: "Bedrijfsprofielen beheren" },
  { href: "/documenten", label: "Documenten", icon: FileText, description: "Uploaden en verwijderen" },
  { href: "/agenda", label: "Activiteiten", icon: CalendarDays, description: "Agenda beheren" },
];

export default async function BeheerPage() {
  await requireBoard();
  const supabase = await createClient();

  const [
    { count: memberCount },
    { count: pendingInvitations },
    { count: pendingRequests },
    { count: upcomingActivities },
    { count: pendingActivities },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("invitations").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("access_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .gte("starts_at", new Date().toISOString()),
    supabase.from("activities").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const stats = [
    { label: "Actieve leden", value: memberCount ?? 0 },
    { label: "Openstaande uitnodigingen", value: pendingInvitations ?? 0 },
    { label: "Openstaande aanvragen", value: pendingRequests ?? 0 },
    { label: "Aankomende activiteiten", value: upcomingActivities ?? 0 },
    { label: "Activiteiten ter goedkeuring", value: pendingActivities ?? 0 },
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map(({ href, label, icon: Icon, description }) => (
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
    </div>
  );
}
