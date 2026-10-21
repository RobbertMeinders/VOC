import "server-only";

import { createClient } from "@/lib/supabase/server";
import { cachedQuery } from "@/lib/cache/queryCache";

// Eén bron voor "hoeveel werk wacht er in Beheer" — tot nu toe telde
// beheer/page.tsx ("Wacht op jou") dit rechtstreeks uit de brontabellen,
// terwijl de "Beheer"-badge in het ledenmenu een heel ander getal toonde
// (ongelezen notificaties die naar /beheer linken, zie
// useUnreadCount.ts/sectionFor) — die twee tellingen konden dus uiteenlopen
// (een notificatie kan gelezen gemarkeerd zijn terwijl de aanvraag zelf nog
// openstaat, of andersom). Dezelfde vijf filters als beheer/page.tsx's
// eigen waitingCounts, hier als losse, herbruikbare telling (head-only
// counts, geen rijen) zodat de root-layout (ledenmenu-badge) en
// beheer/layout.tsx (BeheerSidebar-badges) 'm allebei kunnen gebruiken
// zonder de volledige rijen van beheer/page.tsx te dupliceren.
const TTL_MS = 30_000;
const EXPIRING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type BeheerWaitingCounts = {
  accessRequests: number;
  pendingActivities: number;
  openReports: number;
  pendingMembershipRequests: number;
  expiringInvitations: number;
  total: number;
};

export async function getBeheerWaitingCounts(): Promise<BeheerWaitingCounts> {
  const supabase = await createClient();
  return cachedQuery("beheer-waiting-counts", TTL_MS, async () => {
    const sevenDaysFromNow = new Date(Date.now() + EXPIRING_WINDOW_MS).toISOString();

    const [
      { count: accessRequests },
      { count: pendingActivities },
      { count: openReports },
      { count: pendingMembershipRequests },
      { count: expiringInvitations },
    ] = await Promise.all([
      supabase.from("access_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("activities").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("feed_post_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("company_membership_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase
        .from("invitations")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .lte("expires_at", sevenDaysFromNow),
    ]);

    const counts = {
      accessRequests: accessRequests ?? 0,
      pendingActivities: pendingActivities ?? 0,
      openReports: openReports ?? 0,
      pendingMembershipRequests: pendingMembershipRequests ?? 0,
      expiringInvitations: expiringInvitations ?? 0,
    };

    return { ...counts, total: Object.values(counts).reduce((sum, n) => sum + n, 0) };
  });
}
