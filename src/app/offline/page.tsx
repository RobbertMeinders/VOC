import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = { title: "Geen verbinding" };

// Precached by de service worker (public/sw.js) and shown for a navigation
// request that fails because there's no network — the rest of the app needs
// a live Supabase-verbinding, dus dit is de enige pagina die echt offline
// werkt.
export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <Logo />
      <WifiOff size={32} className="text-muted" />
      <div>
        <h1 className="text-lg font-semibold text-foreground">Geen internetverbinding</h1>
        <p className="mt-1 text-sm text-muted">
          Het ledenportaal heeft een verbinding nodig. Probeer het opnieuw zodra je weer online bent.
        </p>
      </div>
    </div>
  );
}
