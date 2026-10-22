import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isAllowedPushEndpoint } from "@/lib/push/endpoint";

// Tegenhanger van subscribeToPushAction (profiel/actions.ts), maar als
// gewone API-route i.p.v. een server action: sw.js' pushsubscriptionchange-
// handler kan een server action niet aanroepen (geen toegang tot Next's
// interne actie-aanroepmechanisme vanuit een service worker), een rechte
// POST met de sessiecookie (automatisch meegestuurd bij eenzelfde-origin
// fetch) wel. Zelfde upsert/validatie als die action, bewust niet
// samengevoegd om de server-action-interface van de instellingenpagina niet
// aan te hoeven passen voor dit ene extra aanroeppad.
export async function POST(request: Request) {
  const profile = await requireProfile();
  const body = await request.json().catch(() => null);
  const endpoint: unknown = body?.endpoint;
  const p256dh: unknown = body?.keys?.p256dh;
  const auth: unknown = body?.keys?.auth;

  if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof auth !== "string") {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  // M15: zelfde SSRF-afscherming als subscribeToPushAction — dit abonnement
  // wordt later server-side (de pushverzend-cron) zonder verdere controle
  // aangeroepen.
  if (!isAllowedPushEndpoint(endpoint)) {
    return NextResponse.json({ error: "Opnieuw abonneren is niet gelukt." }, { status: 400 });
  }

  const supabase = await createClient();
  const userAgent = request.headers.get("user-agent");

  // Zelfde vervang-i.p.v.-stapelen-logica als subscribeToPushAction
  // (profiel/actions.ts) -- zie de toelichting daar.
  if (userAgent) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("profile_id", profile.id)
      .eq("user_agent", userAgent)
      .neq("endpoint", endpoint);
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ profile_id: profile.id, endpoint, p256dh, auth, user_agent: userAgent }, { onConflict: "endpoint" });

  if (error) {
    return NextResponse.json({ error: "Opnieuw abonneren is niet gelukt." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
