import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseUnsubscribeToken } from "@/lib/newsletter/unsubscribe";
import { escapeHtml } from "@/lib/text/escape-html";

// Afmelden zonder inloggen — zelfde URL voor zowel een mens die op de link
// in de nieuwsbrief klikt (GET, toont een bevestigingsscherm: voorkomt dat
// een e-mailscanner/prefetcher iemand per ongeluk afmeldt) als de
// "one-click"-knop die Gmail/Outlook zelf tonen op basis van de
// List-Unsubscribe-Post-header (POST, direct uitgevoerd, geen scherm nodig).
// Zie src/lib/newsletter/unsubscribe.ts voor de ondertekende code in ?token.

const COLORS = { background: "#f7f7f8", surface: "#ffffff", foreground: "#17171a", muted: "#6b6b72", border: "#e5e5ea", red: "#e8000f" };
const FONT = "-apple-system, 'Segoe UI', Arial, sans-serif";

function page(title: string, body: string, status = 200): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.background};font-family:${FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.background};min-height:100vh;">
<tr><td align="center" style="padding:48px 16px;">
<table role="presentation" width="440" cellpadding="0" cellspacing="0" style="width:100%;max-width:440px;background:${COLORS.surface};border-radius:16px;padding:32px;">
<tr><td style="text-align:center;">
<p style="margin:0 0 16px;font-size:12px;font-weight:600;letter-spacing:0.04em;color:${COLORS.red};text-transform:uppercase;">Veendammer Ondernemers Compagnie</p>
${body}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  return new NextResponse(html, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}

function confirmForm(token: string): string {
  return `<h1 style="margin:0 0 12px;font-size:18px;color:${COLORS.foreground};">Afmelden voor de nieuwsbrief?</h1>
<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${COLORS.muted};">Je ontvangt daarna geen nieuwsbrieven meer van de VOC. Weet je het zeker?</p>
<form method="POST" action="/afmelden?token=${encodeURIComponent(token)}">
<button type="submit" style="display:inline-block;background:${COLORS.foreground};color:#ffffff;font-size:14px;font-weight:600;border:none;cursor:pointer;padding:12px 24px;border-radius:8px;font-family:${FONT};">Afmelden bevestigen</button>
</form>`;
}

function resultMessage(message: string): string {
  return `<p style="margin:0;font-size:15px;line-height:1.6;color:${COLORS.foreground};">${escapeHtml(message)}</p>`;
}

async function performUnsubscribe(token: string): Promise<{ ok: boolean; message: string }> {
  const parsed = parseUnsubscribeToken(token);
  if (!parsed) {
    return { ok: false, message: "Deze afmeldlink is ongeldig." };
  }

  const admin = createAdminClient();
  if (parsed.kind === "profile") {
    const { data } = await admin.from("profiles").select("id, email_campaigns").eq("id", parsed.id).maybeSingle();
    if (!data) return { ok: false, message: "Deze afmeldlink is ongeldig." };
    if (data.email_campaigns === false) return { ok: true, message: "Je was al afgemeld voor de nieuwsbrief." };
    await admin.from("profiles").update({ email_campaigns: false }).eq("id", parsed.id);
    return { ok: true, message: "Je bent afgemeld voor de nieuwsbrief. Via je instellingen in het ledenportaal kun je je weer aanmelden." };
  }

  const { data } = await admin.from("contacts").select("id, opted_out").eq("id", parsed.id).maybeSingle();
  if (!data) return { ok: false, message: "Deze afmeldlink is ongeldig." };
  if (data.opted_out) return { ok: true, message: "Je was al afgemeld voor de nieuwsbrief." };
  await admin.from("contacts").update({ opted_out: true }).eq("id", parsed.id);
  return { ok: true, message: "Je bent afgemeld voor de nieuwsbrief van de VOC." };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const parsed = parseUnsubscribeToken(token);
  if (!parsed) {
    return page("Afmelden", resultMessage("Deze afmeldlink is ongeldig."), 400);
  }
  return page("Afmelden", confirmForm(token));
}

// Zelfde endpoint voor de handmatige bevestiging (form hierboven) en de
// automatische "one-click" van mailclients (RFC 8058) — beide sturen een
// POST naar precies deze URL, met het token in de querystring.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const result = await performUnsubscribe(token);
  return page("Afmelden", resultMessage(result.message), result.ok ? 200 : 400);
}
