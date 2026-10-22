import "server-only";
import { headers } from "next/headers";

// Vercel (en de meeste reverse proxies) zetten x-forwarded-for op
// "client, proxy1, proxy2, ..." -- het eerste adres is het daadwerkelijke
// client-IP, de rest zijn tussenliggende proxies. x-real-ip is de
// terugval voor omgevingen die alleen dat zetten. Geen van beide headers
// is hier te vertrouwen als identiteit (makkelijk te spoofen door wie
// rechtstreeks, niet via de proxy, verbindt) -- alleen bruikbaar als
// zwakke rate-limit-sleutel, nooit voor autorisatie.
export async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip");
}
