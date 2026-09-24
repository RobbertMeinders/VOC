import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Resend signeert webhooks volgens Svix' schema (Resend gebruikt Svix als
// webhook-provider) — geen losse "svix"-dependency nodig voor dit ene
// endpoint, HMAC-SHA256 via Node's ingebouwde crypto volstaat.
const TOLERANCE_SECONDS = 5 * 60;

function verifySignature(payload: string, svixId: string, svixTimestamp: string, svixSignature: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return false;

  const timestamp = Number(svixTimestamp);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) {
    return false;
  }

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
  const expected = createHmac("sha256", secretBytes).update(signedContent).digest("base64");
  const expectedBuffer = Buffer.from(expected);

  // svix-signature kan meerdere, spatie-gescheiden "v1,<base64>"-waarden
  // bevatten (bij secret-rotatie) — genoeg als er één matcht.
  return svixSignature.split(" ").some((candidate) => {
    const signature = candidate.startsWith("v1,") ? candidate.slice(3) : candidate;
    const candidateBuffer = Buffer.from(signature);
    return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
  });
}

export async function POST(request: Request) {
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing signature headers" }, { status: 400 });
  }

  const payload = await request.text();
  if (!verifySignature(payload, svixId, svixTimestamp, svixSignature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { type?: string; data?: { email_id?: string } };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.type === "email.opened" && event.data?.email_id) {
    const supabase = await createClient();
    await supabase.rpc("log_email_opened", { p_provider_id: event.data.email_id });
  }

  return NextResponse.json({ ok: true });
}
