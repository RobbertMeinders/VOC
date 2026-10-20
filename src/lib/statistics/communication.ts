import "server-only";

import { createClient } from "@/lib/supabase/server";
import { cachedQuery } from "@/lib/cache/queryCache";
import { getAllPushSubscriptions, type Kpi } from "./shared";
import type { PeriodRange } from "./period";

const TTL_MS = 60_000;

export type NewsletterRow = {
  id: string;
  subject: string;
  sentAt: string | null;
  ontvangers: number;
  afgeleverd: number;
  mislukt: number;
};

export type CommunicationStats = {
  kpis: {
    nieuwsbrieven: Kpi;
    afgeleverd: Kpi;
    afgemeld: Kpi;
    pushAan: Kpi;
  };
  newsletters: NewsletterRow[];
  meldingenPerType: { label: string; value: number }[];
  kanalen: { label: string; value: number }[];
};

// "Geklikt"/"Afgemeld per nieuwsbrief" ontbreken bewust in de tabel hieronder
// — er is geen klik-tracking en geen per-nieuwsbrief-afmeldregistratie (de
// afmeldlink zet alleen een algemene profiles.email_campaigns=false, niet
// gekoppeld aan wélke verzending). Zelfde principe als eerder al toegepast
// op open-percentages: geen kolom tonen die toch altijd op 0/onbekend zou
// staan.
const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  new_activity: "Nieuwe activiteit",
  activity_reminder: "Activiteitherinnering",
  waitlist_promoted: "Van wachtlijst geplaatst",
  feed_comment: "Reactie op je bericht",
  feed_mention: "Vermelding",
  new_member: "Nieuw lid",
  company_membership_request: "Bedrijfskoppeling ter goedkeuring",
  company_membership_decision: "Bedrijfskoppeling-besluit",
  access_request: "Toegangsaanvraag",
  activity_submission: "Activiteit ter goedkeuring",
  activity_decision: "Activiteit-besluit",
  feed_post_report: "Bericht gerapporteerd",
  manual_broadcast: "Handmatig pushbericht",
};

export async function getCommunicationStats(range: PeriodRange): Promise<CommunicationStats> {
  const supabase = await createClient();
  return cachedQuery(`statistieken-communicatie-${range.period}`, TTL_MS, async () => {
    const [
      { data: communications },
      { data: deliveries },
      { count: activeMemberCount },
      { count: optedOutProfiles },
      { count: optedOutContacts },
      pushSubscriptions,
      { data: channelProfiles },
      { data: notificationsInPeriod },
    ] = await Promise.all([
      supabase
        .from("communications")
        .select("id, subject, status, sent_at")
        .eq("status", "verzonden")
        .order("sent_at", { ascending: false }),
      supabase.from("communication_deliveries").select("communication_id, status"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("email_campaigns", false),
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("opted_out", true),
      getAllPushSubscriptions(supabase),
      supabase
        .from("profiles")
        .select("id, push_activities, push_feed, push_new_members, email_activities, email_feed, email_new_members")
        .eq("is_active", true),
      supabase
        .from("notifications")
        .select("type")
        .gte("created_at", range.start.toISOString())
        .lt("created_at", range.end.toISOString())
        .neq("type", "newsletter"),
    ]);

    const deliveriesByCommunication = new Map<string, { sent: number; failed: number; total: number }>();
    for (const d of deliveries ?? []) {
      const row = deliveriesByCommunication.get(d.communication_id) ?? { sent: 0, failed: 0, total: 0 };
      row.total += 1;
      if (d.status === "verstuurd") row.sent += 1;
      if (d.status === "mislukt") row.failed += 1;
      deliveriesByCommunication.set(d.communication_id, row);
    }

    const newsletters: NewsletterRow[] = (communications ?? []).map((c) => {
      const row = deliveriesByCommunication.get(c.id) ?? { sent: 0, failed: 0, total: 0 };
      return { id: c.id, subject: c.subject, sentAt: c.sent_at, ontvangers: row.total, afgeleverd: row.sent, mislukt: row.failed };
    });

    const newslettersInPeriod = newsletters.filter((n) => n.sentAt && n.sentAt >= range.start.toISOString() && n.sentAt < range.end.toISOString());
    const newslettersInPrevPeriod = newsletters.filter(
      (n) => n.sentAt && n.sentAt >= range.prevStart.toISOString() && n.sentAt < range.prevEnd.toISOString()
    );
    const deliveredInPeriod = newslettersInPeriod.reduce((sum, n) => sum + n.afgeleverd, 0);
    const totalInPeriod = newslettersInPeriod.reduce((sum, n) => sum + n.ontvangers, 0);
    const deliveredPct = totalInPeriod > 0 ? Math.round((deliveredInPeriod / totalInPeriod) * 100) : null;
    const deliveredInPrevPeriod = newslettersInPrevPeriod.reduce((sum, n) => sum + n.afgeleverd, 0);
    const totalInPrevPeriod = newslettersInPrevPeriod.reduce((sum, n) => sum + n.ontvangers, 0);
    const deliveredPctPrev = totalInPrevPeriod > 0 ? Math.round((deliveredInPrevPeriod / totalInPrevPeriod) * 100) : null;

    const pushUniqueMembers = new Set(pushSubscriptions.map((s) => s.profile_id)).size;
    const pushPct = activeMemberCount ? Math.round((pushUniqueMembers / activeMemberCount) * 100) : 0;

    const totalOptedOut = (optedOutProfiles ?? 0) + (optedOutContacts ?? 0);

    const meldingenCounts = new Map<string, number>();
    for (const n of notificationsInPeriod ?? []) {
      meldingenCounts.set(n.type, (meldingenCounts.get(n.type) ?? 0) + 1);
    }
    const meldingenPerType = [...meldingenCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([type, value]) => ({ label: NOTIFICATION_TYPE_LABELS[type] ?? type, value }));

    const channelRows = channelProfiles ?? [];
    const pushOnCount = channelRows.filter((p) => p.push_activities || p.push_feed || p.push_new_members).length;
    const emailOnCount = channelRows.filter((p) => p.email_activities || p.email_feed || p.email_new_members).length;
    const total = channelRows.length || 1;
    const kanalen = [
      { label: "Ook als pushmelding", value: Math.round((pushOnCount / total) * 100) },
      { label: "Ook per e-mail", value: Math.round((emailOnCount / total) * 100) },
      {
        label: "Alleen in het portaal",
        value: Math.round((channelRows.filter((p) => !p.push_activities && !p.push_feed && !p.push_new_members && !p.email_activities && !p.email_feed && !p.email_new_members).length / total) * 100),
      },
    ];

    return {
      kpis: {
        nieuwsbrieven: { label: "Nieuwsbrieven verstuurd", value: newslettersInPeriod.length, previousValue: newslettersInPrevPeriod.length },
        afgeleverd: {
          label: "Afgeleverd",
          value: deliveredPct ?? 0,
          unit: "%",
          previousValue: deliveredPctPrev,
          note: deliveredPct === null ? "geen nieuwsbrief in deze periode" : undefined,
        },
        afgemeld: {
          label: "Afgemeld (totaal)",
          value: totalOptedOut,
          previousValue: null,
          note: "huidig totaal, niet periodegebonden",
        },
        pushAan: { label: "Leden met pushmeldingen", value: pushPct, unit: "%", previousValue: null },
      },
      newsletters,
      meldingenPerType,
      kanalen,
    };
  });
}
