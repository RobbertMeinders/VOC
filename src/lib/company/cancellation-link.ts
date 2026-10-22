import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

// Zelfde aanpak als src/lib/newsletter/unsubscribe.ts (ondertekend bedrijfs-
// id, geen losse tokenkolom nodig) — maar met een EIGEN secret, bewust niet
// UNSUBSCRIBE_SECRET hergebruikt: dit token bevestigt het opzeggen van een
// lidmaatschap (een heel ander, gevoeliger doel dan een nieuwsbrief-
// afmelding), dus een eigen geheim houdt de twee volledig los van elkaar.
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function secret(): string | null {
  return process.env.COMPANY_CANCELLATION_SECRET || null;
}

function sign(companyId: string, issuedAt: number): string {
  const key = secret();
  if (!key) {
    throw new Error("COMPANY_CANCELLATION_SECRET ontbreekt, kan geen bevestigingslink genereren.");
  }
  return createHmac("sha256", key).update(`${companyId}:${issuedAt}`).digest("base64url").slice(0, 22);
}

export function buildCancellationToken(companyId: string): string {
  const issuedAt = Date.now();
  return `${companyId}.${issuedAt}.${sign(companyId, issuedAt)}`;
}

// issuedAt in de ondertekende payload: zonder dit zou een bevestigingslink
// voor altijd geldig blijven (het token zelf bevat geen vervaldatum), ook
// nog ruim na het moment dat de opzegging al lang bevestigd of weer
// ingetrokken is. TOKEN_TTL_MS (7 dagen) geeft ruim de tijd om de e-mail te
// bevestigen zonder een oude link onbeperkt bruikbaar te laten.
export function parseCancellationToken(token: string): { companyId: string } | null {
  // Geen geconfigureerd geheim: elke link is sowieso ongeldig — zelfde
  // nette afhandeling als bij een kapot afmeldtoken, i.p.v. de route een
  // 500 te laten geven.
  if (!secret()) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [companyId, issuedAtRaw, signature] = parts;
  if (!companyId || !issuedAtRaw || !signature) return null;

  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) return null;
  if (Date.now() - issuedAt > TOKEN_TTL_MS) return null;

  const expected = sign(companyId, issuedAt);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return { companyId };
}

export function buildCancellationConfirmUrl(siteUrl: string, companyId: string): string {
  const token = buildCancellationToken(companyId);
  return `${siteUrl.replace(/\/$/, "")}/opzegging-bevestigen?token=${encodeURIComponent(token)}`;
}
