import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseUnsubscribeToken, type UnsubscribeKind } from "@/lib/newsletter/unsubscribe";
import { escapeHtml } from "@/lib/text/escape-html";
import { fetchAppSettings } from "@/lib/settings/app-settings";

// Afmelden zonder inloggen — zelfde URL voor zowel een mens die op de link
// in de nieuwsbrief klikt (GET, toont een bevestigingsscherm: voorkomt dat
// een e-mailscanner/prefetcher iemand per ongeluk afmeldt) als de
// "one-click"-knop die Gmail/Outlook zelf tonen op basis van de
// List-Unsubscribe-Post-header (POST, direct uitgevoerd, geen scherm nodig).
// Zie src/lib/newsletter/unsubscribe.ts voor de ondertekende code in ?token.

const COLORS = { background: "#f7f7f8", surface: "#ffffff", foreground: "#17171a", muted: "#6b6b72", border: "#e5e5ea", red: "#e8000f" };
const FONT = "-apple-system, 'Segoe UI', Arial, sans-serif";

// Logo i.p.v. de kale orgnaam-tekst erboven (live feedback) — zelfde
// terugval-logica als renderHeader() in newsletter/render.ts: logo_url uit
// app_settings als het bestuur die gezet heeft, anders het vaste beeldmerk.
// siteUrl is nodig voor die terugval-afbeelding; logoUrl zelf is, indien
// gezet, al een absolute URL.
function page(title: string, body: string, logoSrc: string, status = 200): NextResponse {
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
<img src="${escapeHtml(logoSrc)}" alt="" width="40" style="width:40px;height:auto;display:block;margin:0 auto 20px;" />
${body}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  return new NextResponse(html, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}

function confirmForm(token: string, orgName: string, kind: UnsubscribeKind): string {
  // Personenmodel Fase 3: "public_registration" gaat over het intrekken van
  // één activiteit-aanmelding, niet over de nieuwsbrief -- eigen titel/tekst
  // op dezelfde pagina/route, i.p.v. een losse tweede afmeldroute.
  if (kind === "public_registration") {
    return `<h1 style="margin:0 0 12px;font-size:18px;color:${COLORS.foreground};">Aanmelding intrekken?</h1>
<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${COLORS.muted};">Je aanmelding voor deze activiteit wordt verwijderd. Weet je het zeker?</p>
<form method="POST" action="/afmelden?token=${encodeURIComponent(token)}">
<button type="submit" style="display:inline-block;background:${COLORS.foreground};color:#ffffff;font-size:14px;font-weight:600;border:none;cursor:pointer;padding:12px 24px;border-radius:8px;font-family:${FONT};">Aanmelding intrekken</button>
</form>`;
  }

  // "Later terugzetten"-opmerking alleen voor leden (profile) -- een
  // contact heeft geen portaalaccount/instellingenpagina om zich weer aan
  // te melden; die kan alleen via het bestuur terug op de lijst komen.
  const reenableNote =
    kind === "profile"
      ? `<p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:${COLORS.muted};">Je kunt dit later altijd weer aanzetten via je instellingen in het ledenportaal.</p>`
      : "";
  return `<h1 style="margin:0 0 12px;font-size:18px;color:${COLORS.foreground};">Afmelden voor de nieuwsbrief?</h1>
<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:${COLORS.muted};">Je ontvangt daarna geen nieuwsbrieven meer van ${escapeHtml(orgName)}. Weet je het zeker?</p>
${reenableNote}
<form method="POST" action="/afmelden?token=${encodeURIComponent(token)}">
<button type="submit" style="display:inline-block;background:${COLORS.foreground};color:#ffffff;font-size:14px;font-weight:600;border:none;cursor:pointer;padding:12px 24px;border-radius:8px;font-family:${FONT};">Afmelden bevestigen</button>
</form>`;
}

function resultMessage(message: string): string {
  return `<p style="margin:0;font-size:15px;line-height:1.6;color:${COLORS.foreground};">${escapeHtml(message)}</p>`;
}

async function performUnsubscribe(token: string, orgName: string): Promise<{ ok: boolean; message: string }> {
  const parsed = parseUnsubscribeToken(token);
  if (!parsed) {
    return { ok: false, message: "Deze afmeldlink is ongeldig." };
  }

  const admin = createAdminClient();
  if (parsed.kind === "public_registration") {
    // Verwijdert de rij i.p.v. een los "ingetrokken"-vlag -- dit is
    // dezelfde tabel waarop upsert_public_activity_registration het
    // maximum aantal deelnemers telt, dus intrekken maakt de plek ook
    // meteen weer vrij voor iemand anders.
    const { data } = await admin.from("public_activity_registrations").select("id").eq("id", parsed.id).maybeSingle();
    if (!data) return { ok: true, message: "Deze aanmelding was al ingetrokken of bestaat niet meer." };
    await admin.from("public_activity_registrations").delete().eq("id", parsed.id);
    return { ok: true, message: "Je aanmelding is ingetrokken." };
  }
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
  return { ok: true, message: `Je bent afgemeld voor de nieuwsbrief van ${orgName}.` };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const admin = createAdminClient();
  const settings = await fetchAppSettings(admin);
  const logoSrc = settings.logo_url || `${(process.env.SITE_URL ?? "").replace(/\/$/, "")}/brand/voc-logo-mark.png`;

  const parsed = parseUnsubscribeToken(token);
  if (!parsed) {
    return page("Afmelden", resultMessage("Deze afmeldlink is ongeldig."), logoSrc, 400);
  }
  const title = parsed.kind === "public_registration" ? "Aanmelding intrekken" : "Afmelden";
  return page(title, confirmForm(token, settings.org_name, parsed.kind), logoSrc);
}

// Zelfde endpoint voor de handmatige bevestiging (form hierboven) en de
// automatische "one-click" van mailclients (RFC 8058) — beide sturen een
// POST naar precies deze URL, met het token in de querystring.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const admin = createAdminClient();
  const settings = await fetchAppSettings(admin);
  const logoSrc = settings.logo_url || `${(process.env.SITE_URL ?? "").replace(/\/$/, "")}/brand/voc-logo-mark.png`;

  const result = await performUnsubscribe(token, settings.org_name);
  const parsed = parseUnsubscribeToken(token);
  const title = parsed?.kind === "public_registration" ? "Aanmelding intrekken" : "Afmelden";
  return page(title, resultMessage(result.message), logoSrc, result.ok ? 200 : 400);
}
