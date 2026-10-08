import { NextResponse } from "next/server";
import { dispatchPendingEmailNotifications } from "@/lib/notifications/dispatch-email";

// Mirror van /api/cron/send-push — zelfde CRON_SECRET-patroon, blijft het
// vangnet voor het e-mailkanaal.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await dispatchPendingEmailNotifications(50);
  return NextResponse.json({ sent: result.sent });
}
