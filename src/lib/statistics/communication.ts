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
      { data: deliveryStats },
      { count: activeMemberCount },
      { count: optedOutProfiles },
      { count: optedOutContacts },
      pushSubscriptions,
      { data: channelProfiles },
      { data: notificationTypeCounts },
    ] = await Promise.all([
      // Foutenrapport M6: ook verzenden_mislukt meetellen — een deels
      // verstuurde nieuwsbrief (gedeeltelijke fout tijdens verzenden) heeft
      // al wel communication_deliveries en hoort dus niet overal als "nog
      // niet verstuurd" te verschijnen.
      supabase
        .from("communications")
        .select("id, subject, status, sent_at")
        .in("status", ["verzonden", "verzenden_mislukt"])
        .order("sent_at", { ascending: false }),
      // Foutenrapport M12: get_communication_delivery_stats() groepeert in
      // SQL i.p.v. alle communication_deliveries-rijen (all-time,
      // ongelimiteerd) naar de client te halen.
      supabase.rpc("get_communication_delivery_stats"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("email_campaigns", false),
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("opted_out", true),
      getAllPushSubscriptions(supabase),
      supabase
        .from("profiles")
        .select("id, push_activities, push_feed, push_new_members, email_activities, email_feed, email_new_members")
        .eq("is_active", true),
      // Foutenrapport M12: get_notification_type_counts() groepeert in SQL
      // i.p.v. elke meldingsrij in de periode (kan al snel honderden per
      // nieuwe activiteit zijn) naar de client te halen.
      supabase.rpc("get_notification_type_counts", { p_start: range.start.toISOString(), p_end: range.end.toISOString() }),
    ]);

    const deliveriesByCommunication = new Map<string, { sent: number; failed: number; total: number }>();
    for (const row of deliveryStats ?? []) {
      deliveriesByCommunication.set(row.communication_id, { sent: Number(row.sent), failed: Number(row.failed), total: Number(row.total) });
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

    const meldingenPerType = [...(notificationTypeCounts ?? [])]
      .sort((a, b) => Number(b.cnt) - Number(a.cnt))
      .slice(0, 6)
      .map((row) => ({ label: NOTIFICATION_TYPE_LABELS[row.type] ?? row.type, value: Number(row.cnt) }));

    // Foutenrapport M7: "aan" betekende hier alleen dat de voorkeursvlag
    // (standaard aan) niet is uitgezet — of iemand ook echt een
    // push_subscription heeft (zie pushSubscriptions, al opgehaald voor de
    // KPI hierboven) telde niet mee, waardoor dit percentage structureel
    // hoger uitkwam dan het werkelijke aandeel leden dat pushmeldingen kan
    // ontvangen.
    const pushSubscribedProfileIds = new Set(pushSubscriptions.map((s) => s.profile_id));
    const channelRows = channelProfiles ?? [];
    const pushOnCount = channelRows.filter(
      (p) => (p.push_activities || p.push_feed || p.push_new_members) && pushSubscribedProfileIds.has(p.id)
    ).length;
    const emailOnCount = channelRows.filter((p) => p.email_activities || p.email_feed || p.email_new_members).length;
    const total = channelRows.length || 1;
    const kanalen = [
      { label: "Ook als pushmelding", value: Math.round((pushOnCount / total) * 100) },
      { label: "Ook per e-mail", value: Math.round((emailOnCount / total) * 100) },
      {
        label: "Alleen in het portaal",
        value: Math.round(
          (channelRows.filter(
            (p) =>
              !((p.push_activities || p.push_feed || p.push_new_members) && pushSubscribedProfileIds.has(p.id)) &&
              !p.email_activities &&
              !p.email_feed &&
              !p.email_new_members
          ).length /
            total) *
            100
        ),
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
