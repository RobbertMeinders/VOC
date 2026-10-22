import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

// Zelfde aanpak als src/lib/newsletter/unsubscribe.ts (ondertekend bedrijfs-
// id, geen losse tokenkolom nodig) — maar met een EIGEN secret, bewust niet
// UNSUBSCRIBE_SECRET hergebruikt: dit token bevestigt het opzeggen van een
// lidmaatschap (een heel ander, gevoeliger doel dan een nieuwsbrief-
// afmelding), dus een eigen geheim houdt de twee volledig los van elkaar.
function secret(): string | null {
  return process.env.COMPANY_CANCELLATION_SECRET || null;
}

function sign(companyId: string): string {
  const key = secret();
  if (!key) {
    throw new Error("COMPANY_CANCELLATION_SECRET ontbreekt, kan geen bevestigingslink genereren.");
  }
  return createHmac("sha256", key).update(companyId).digest("base64url").slice(0, 22);
}

export function buildCancellationToken(companyId: string): string {
  return `${companyId}.${sign(companyId)}`;
}

export function parseCancellationToken(token: string): { companyId: string } | null {
  // Geen geconfigureerd geheim: elke link is sowieso ongeldig — zelfde
  // nette afhandeling als bij een kapot afmeldtoken, i.p.v. de route een
  // 500 te laten geven.
  if (!secret()) return null;

  const idx = token.lastIndexOf(".");
  if (idx <= 0) return null;
  const companyId = token.slice(0, idx);
  const signature = token.slice(idx + 1);
  if (!companyId || !signature) return null;

  const expected = sign(companyId);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return { companyId };
}

export function buildCancellationConfirmUrl(siteUrl: string, companyId: string): string {
  const token = buildCancellationToken(companyId);
  return `${siteUrl.replace(/\/$/, "")}/opzegging-bevestigen?token=${encodeURIComponent(token)}`;
}
