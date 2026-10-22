import "server-only";
import { timingSafeEqual } from "node:crypto";

// Elke /api/cron/*-route vergeleek de Authorization-header tot nu toe met
// een gewone `!==`-stringvergelijking — die stopt bij het eerste
// afwijkende teken, wat in theorie (niet praktisch aangetoond, maar een
// bekende bugklasse) een timing-aanval toelaat om CRON_SECRET teken voor
// teken te raden via de reactietijd. timingSafeEqual vergelijkt altijd in
// constante tijd. Verschillende lengte betekent sowieso geen match (en
// timingSafeEqual zou daar zelf een exception op gooien), dus die check
// blijft ervoor.
export function isValidCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authHeader);
  if (expected.length !== actual.length) return false;

  return timingSafeEqual(expected, actual);
}
