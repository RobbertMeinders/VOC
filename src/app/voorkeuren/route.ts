import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseUnsubscribeToken } from "@/lib/newsletter/unsubscribe";
import { escapeHtml } from "@/lib/text/escape-html";

// Mailvoorkeuren aanpassen zonder inloggen -- zelfde ondertekende token als
// /afmelden (parseUnsubscribeToken, p.<id>.<sig> / c.<id>.<sig>), niet
// actie-specifiek: de link in elke mailfooter werkt hier net zo goed als op
// /afmelden. Reden voor dit bestaan: de footer "Voorkeuren aanpassen" wees
// voorheen naar /instellingen, wat inloggen vereist -- een lid dat vanuit
// een automatische melding alleen DAT soort mail wil uitzetten, moest zich
// daarvoor eerst aanmelden. Zelfde patroon/stijl als src/app/afmelden/
// route.ts (losse, hand-opgebouwde HTML-pagina, geen React/sessie nodig).
//
// Alleen de E-MAILkant van de meldingsvoorkeuren (geen "App"/push -- dat
// kun je vanaf een anonieme maillink niet zinvol instellen, blijft in het
// portaal) en geen "Dagelijkse samenvatting"-optie (vervalt sowieso in de
// lopende designronde). Contacten (geen account) hebben alleen
// contacts.opted_out, geen meldingstypes.

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

function invalidLink(): NextResponse {
  return page(
    "Voorkeuren",
    `<p style="margin:0;font-size:15px;line-height:1.6;color:${COLORS.foreground};">Deze link is ongeldig.</p>`,
    400
  );
}

function checkboxRow(name: string, label: string, checked: boolean): string {
  return `<label style="display:flex;align-items:center;gap:10px;text-align:left;margin:0 0 14px;cursor:pointer;">
<input type="checkbox" name="${escapeHtml(name)}" ${checked ? "checked" : ""} style="width:18px;height:18px;flex-shrink:0;accent-color:${COLORS.red};" />
<span style="font-size:14px;color:${COLORS.foreground};">${escapeHtml(label)}</span>
</label>`;
}

function footerLinks(token: string, siteUrl: string): string {
  return `<div style="margin-top:24px;padding-top:16px;border-top:1px solid ${COLORS.border};">
<p style="margin:0 0 8px;font-size:13px;color:${COLORS.muted};">
Meer instellen? <a href="${escapeHtml(`${siteUrl}/instellingen`)}" style="color:${COLORS.muted};text-decoration:underline;">Log in op het ledenportaal</a>.
</p>
<a href="/afmelden?token=${encodeURIComponent(token)}" style="font-size:13px;color:${COLORS.muted};text-decoration:underline;">Afmelden voor de nieuwsbrief</a>
</div>`;
}

type ProfilePrefs = {
  email_campaigns: boolean;
  email_new_activity: boolean;
  email_activity_reminder: boolean;
  email_feed_comment: boolean;
  email_feed_mention: boolean;
};

function profileForm(token: string, siteUrl: string, prefs: ProfilePrefs, saved: boolean): string {
  return `${saved ? `<p style="margin:0 0 16px;font-size:14px;color:${COLORS.foreground};">Opgeslagen.</p>` : ""}
<h1 style="margin:0 0 16px;font-size:18px;color:${COLORS.foreground};">Mailvoorkeuren</h1>
<form method="POST" action="/voorkeuren?token=${encodeURIComponent(token)}" style="text-align:left;">
${checkboxRow("email_campaigns", "Nieuwsbrieven", prefs.email_campaigns)}
${checkboxRow("email_new_activity", "Nieuwe activiteiten", prefs.email_new_activity)}
${checkboxRow("email_activity_reminder", "Herinnering voor een activiteit", prefs.email_activity_reminder)}
${checkboxRow("email_feed_comment", "Reacties op je berichten", prefs.email_feed_comment)}
${checkboxRow("email_feed_mention", "Als iemand je @vermeldt", prefs.email_feed_mention)}
<button type="submit" style="margin-top:8px;display:inline-block;background:${COLORS.foreground};color:#ffffff;font-size:14px;font-weight:600;border:none;cursor:pointer;padding:12px 24px;border-radius:8px;font-family:${FONT};">Opslaan</button>
</form>
${footerLinks(token, siteUrl)}`;
}

function contactForm(token: string, newsletterOn: boolean, saved: boolean): string {
  return `${saved ? `<p style="margin:0 0 16px;font-size:14px;color:${COLORS.foreground};">Opgeslagen.</p>` : ""}
<h1 style="margin:0 0 16px;font-size:18px;color:${COLORS.foreground};">Mailvoorkeuren</h1>
<form method="POST" action="/voorkeuren?token=${encodeURIComponent(token)}" style="text-align:left;">
${checkboxRow("newsletter", "Nieuwsbrief ontvangen", newsletterOn)}
<button type="submit" style="margin-top:8px;display:inline-block;background:${COLORS.foreground};color:#ffffff;font-size:14px;font-weight:600;border:none;cursor:pointer;padding:12px 24px;border-radius:8px;font-family:${FONT};">Opslaan</button>
</form>
<div style="margin-top:24px;padding-top:16px;border-top:1px solid ${COLORS.border};">
<a href="/afmelden?token=${encodeURIComponent(token)}" style="font-size:13px;color:${COLORS.muted};text-decoration:underline;">Afmelden voor de nieuwsbrief</a>
</div>`;
}

async function renderForm(token: string, saved: boolean): Promise<NextResponse> {
  const parsed = parseUnsubscribeToken(token);
  if (!parsed) return invalidLink();

  const admin = createAdminClient();
  const siteUrl = (process.env.SITE_URL ?? "").replace(/\/$/, "");

  if (parsed.kind === "profile") {
    const { data } = await admin
      .from("profiles")
      .select("email_campaigns, email_new_activity, email_activity_reminder, email_feed_comment, email_feed_mention")
      .eq("id", parsed.id)
      .maybeSingle();
    if (!data) return invalidLink();
    return page("Voorkeuren", profileForm(token, siteUrl, data, saved));
  }

  const { data } = await admin.from("contacts").select("opted_out").eq("id", parsed.id).maybeSingle();
  if (!data) return invalidLink();
  return page("Voorkeuren", contactForm(token, !data.opted_out, saved));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  return renderForm(token, false);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const parsed = parseUnsubscribeToken(token);
  if (!parsed) return invalidLink();

  const form = await request.formData();
  const admin = createAdminClient();

  if (parsed.kind === "profile") {
    await admin
      .from("profiles")
      .update({
        email_campaigns: form.has("email_campaigns"),
        email_new_activity: form.has("email_new_activity"),
        email_activity_reminder: form.has("email_activity_reminder"),
        email_feed_comment: form.has("email_feed_comment"),
        email_feed_mention: form.has("email_feed_mention"),
      })
      .eq("id", parsed.id);
  } else {
    await admin.from("contacts").update({ opted_out: !form.has("newsletter") }).eq("id", parsed.id);
  }

  return renderForm(token, true);
}
