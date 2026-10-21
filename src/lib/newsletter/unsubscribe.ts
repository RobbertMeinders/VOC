import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

export type UnsubscribeKind = "profile" | "contact";

// Ondertekende afmeldcode i.p.v. een los op te slaan tokenkolom: het id van
// het lid/contact staat al vast en is niet te raden (uuid), de handtekening
// voorkomt alleen dat iemand een ANDER id in de link verzint.
//
// Laag (beveiligingsfixlijst Blok 3): viel voorheen terug op
// SUPABASE_SERVICE_ROLE_KEY als UNSUBSCRIBE_SECRET niet gezet was — dat
// hergebruikt een zeer gevoelig, volledig databasetoegang-gevend geheim
// voor een heel andere, publiek-blootgestelde functie (een afmeldlink in
// elke verzonden nieuwsbrief). Een eigen, verplicht UNSUBSCRIBE_SECRET
// houdt die twee geheimen gescheiden.
function secret(): string | null {
  return process.env.UNSUBSCRIBE_SECRET || null;
}

function sign(payload: string): string {
  const key = secret();
  if (!key) {
    throw new Error("UNSUBSCRIBE_SECRET ontbreekt — kan geen afmeldlink genereren.");
  }
  return createHmac("sha256", key).update(payload).digest("base64url").slice(0, 22);
}

export function buildUnsubscribeToken(kind: UnsubscribeKind, id: string): string {
  const prefix = kind === "profile" ? "p" : "c";
  return `${prefix}.${id}.${sign(`${prefix}:${id}`)}`;
}

export function parseUnsubscribeToken(token: string): { kind: UnsubscribeKind; id: string } | null {
  // Geen geconfigureerd geheim: elke link is sowieso ongeldig — zelfde
  // nette "link ongeldig"-afhandeling als voor elk ander kapot token,
  // i.p.v. de hele /afmelden-route met een 500 te laten crashen.
  if (!secret()) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [prefix, id, signature] = parts;
  if (prefix !== "p" && prefix !== "c") return null;
  if (!id || !signature) return null;

  const expected = sign(`${prefix}:${id}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return { kind: prefix === "p" ? "profile" : "contact", id };
}

export function buildUnsubscribeUrl(siteUrl: string, kind: UnsubscribeKind, id: string): string {
  const token = buildUnsubscribeToken(kind, id);
  return `${siteUrl.replace(/\/$/, "")}/afmelden?token=${encodeURIComponent(token)}`;
}
