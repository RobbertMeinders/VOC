import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseCancellationToken } from "@/lib/company/cancellation-link";
import { escapeHtml } from "@/lib/text/escape-html";

// Bevestigen van een opzegging zonder inloggen — zelfde opzet als
// /afmelden/route.ts (GET toont een bevestigingsscherm, voorkomt dat een
// e-mailscanner/prefetcher per ongeluk bevestigt; POST voert het echt uit).
// Het ondertekende token (src/lib/company/cancellation-link.ts) bewijst de
// autorisatie al — dit is bewust GEEN RPC met een anon-grant, maar een
// directe update via de admin/service-role-client, zodat de alleen-SQL-
// laag nooit los van dit token aanroepbaar is.

const COLORS = { background: "#f7f7f8", surface: "#ffffff", foreground: "#17171a", muted: "#6b6b72", red: "#e8000f" };
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

function confirmForm(token: string, companyName: string, endDate: string): string {
  return `<h1 style="margin:0 0 12px;font-size:18px;color:${COLORS.foreground};">Opzegging bevestigen?</h1>
<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${COLORS.muted};">Het lidmaatschap van ${escapeHtml(companyName)} wordt per ${escapeHtml(endDate)} beëindigd. Tot die datum blijft alle toegang gewoon bestaan.</p>
<form method="POST" action="/opzegging-bevestigen?token=${encodeURIComponent(token)}">
<button type="submit" style="display:inline-block;background:${COLORS.foreground};color:#ffffff;font-size:14px;font-weight:600;border:none;cursor:pointer;padding:12px 24px;border-radius:8px;font-family:${FONT};">Opzegging bevestigen</button>
</form>`;
}

function resultMessage(message: string): string {
  return `<p style="margin:0;font-size:15px;line-height:1.6;color:${COLORS.foreground};">${escapeHtml(message)}</p>`;
}

async function lookupPendingCancellation(companyId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("companies")
    .select("id, name, membership_status, membership_end_date")
    .eq("id", companyId)
    .maybeSingle();
  return data;
}

async function performConfirm(companyId: string): Promise<{ ok: boolean; message: string }> {
  const admin = createAdminClient();
  const company = await lookupPendingCancellation(companyId);
  if (!company) return { ok: false, message: "Deze bevestigingslink is ongeldig." };
  if (company.membership_status === "opgezegd" || company.membership_status === "oud-lid") {
    return { ok: true, message: "Deze opzegging is al bevestigd." };
  }
  if (company.membership_status !== "lid" || !company.membership_end_date) {
    return { ok: false, message: "Er staat geen opzegging open om te bevestigen." };
  }

  await admin.from("companies").update({ membership_status: "opgezegd" }).eq("id", companyId).eq("membership_status", "lid");

  return {
    ok: true,
    message: `Je opzegging is bevestigd. Het lidmaatschap van ${company.name} loopt tot ${new Date(company.membership_end_date).toLocaleDateString("nl-NL")}.`,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const parsed = parseCancellationToken(token);
  if (!parsed) {
    return page("Opzegging bevestigen", resultMessage("Deze bevestigingslink is ongeldig."), 400);
  }

  const company = await lookupPendingCancellation(parsed.companyId);
  if (!company || company.membership_status !== "lid" || !company.membership_end_date) {
    return page("Opzegging bevestigen", resultMessage("Er staat geen opzegging (meer) open om te bevestigen."), 400);
  }

  return page(
    "Opzegging bevestigen",
    confirmForm(token, company.name, new Date(company.membership_end_date).toLocaleDateString("nl-NL"))
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const parsed = parseCancellationToken(token);
  if (!parsed) {
    return page("Opzegging bevestigen", resultMessage("Deze bevestigingslink is ongeldig."), 400);
  }

  const result = await performConfirm(parsed.companyId);
  return page("Opzegging bevestigen", resultMessage(result.message), result.ok ? 200 : 400);
}
