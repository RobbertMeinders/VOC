import { NextResponse } from "next/server";
import { dispatchDailyEmailDigest } from "@/lib/notifications/dispatch-email-digest";
import { isValidCronSecret } from "@/lib/auth/cron-secret";

// Mirror van /api/cron/send-email-notifications — zelfde CRON_SECRET-
// patroon. Draait een half uur na die cron (zie vercel.json) zodat de
// directe/instant-dispatch van dezelfde ochtend al een kans heeft gehad,
// vóór deze de overgebleven (digest-gekozen) rijen oppikt.
export async function GET(request: Request) {
  if (!isValidCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await dispatchDailyEmailDigest();
  return NextResponse.json({ sent: result.sent });
}
