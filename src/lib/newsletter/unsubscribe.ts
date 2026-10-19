import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

export type UnsubscribeKind = "profile" | "contact";

// Ondertekende afmeldcode i.p.v. een los op te slaan tokenkolom: het id van
// het lid/contact staat al vast en is niet te raden (uuid), de handtekening
// voorkomt alleen dat iemand een ANDER id in de link verzint. Valt terug op
// SUPABASE_SERVICE_ROLE_KEY als er geen eigen UNSUBSCRIBE_SECRET is gezet,
// zodat deze link werkt zonder dat daarvoor een extra omgevingsvariabele
// verplicht is.
function secret(): string {
  return process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url").slice(0, 22);
}

export function buildUnsubscribeToken(kind: UnsubscribeKind, id: string): string {
  const prefix = kind === "profile" ? "p" : "c";
  return `${prefix}.${id}.${sign(`${prefix}:${id}`)}`;
}

export function parseUnsubscribeToken(token: string): { kind: UnsubscribeKind; id: string } | null {
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
