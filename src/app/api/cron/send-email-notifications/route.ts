import { NextResponse } from "next/server";
import { dispatchPendingEmailNotifications } from "@/lib/notifications/dispatch-email";
import { isValidCronSecret } from "@/lib/auth/cron-secret";

// Mirror van /api/cron/send-push — zelfde CRON_SECRET-patroon, blijft het
// vangnet voor het e-mailkanaal.
export async function GET(request: Request) {
  if (!isValidCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await dispatchPendingEmailNotifications(50);
  return NextResponse.json({ sent: result.sent });
}
