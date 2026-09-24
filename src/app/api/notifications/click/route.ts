import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Aangeroepen door sw.js bij het klikken op een pushmelding — geen
// ingelogde sessie vereist, want het profiel wordt server-side afgeleid uit
// de notificatie-id zelf (log_notification_click, security definer), nooit
// van de client vertrouwd.
export async function POST(request: Request) {
  let notificationId: unknown;
  try {
    ({ notification_id: notificationId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (typeof notificationId !== "string" || !notificationId) {
    return NextResponse.json({ error: "notification_id is verplicht" }, { status: 400 });
  }

  const supabase = await createClient();
  await supabase.rpc("log_notification_click", { p_notification_id: notificationId });

  return NextResponse.json({ ok: true });
}
