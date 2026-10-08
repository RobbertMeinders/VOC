import { NextResponse } from "next/server";
import { dispatchPendingPushNotifications } from "@/lib/notifications/dispatch-push";

// Hit periodically by Vercel Cron (see vercel.json) — vangnet voor alles wat
// niet via een directe after()-aanroep (zie agenda/actions.ts, (app)/
// actions.ts) al meteen is verstuurd, en de enige weg voor notificatietypes
// zonder zo'n directe aanroeppunt (bv. activity_reminder, die alleen uit een
// eigen cron komt).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await dispatchPendingPushNotifications(50);
  return NextResponse.json({ sent: result.sent });
}
