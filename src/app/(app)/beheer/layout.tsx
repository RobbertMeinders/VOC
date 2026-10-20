import type { ReactNode } from "react";
import { requireBoard } from "@/lib/auth/session";
import { BeheerSidebar } from "@/components/beheer/BeheerSidebar";
import { getBeheerWaitingCounts } from "@/lib/beheer/waitingCounts";

// Permanent zij-menu voor de hele /beheer-sectie i.p.v. dat elke pagina
// zelf terugleidt naar het kaartjes-overzicht op /beheer — zie
// BeheerSidebar. De bredere, niet-gecentreerde paginabreedte voor alle
// /beheer/*-routes zit in AppShell zelf (op pathname bepaald), niet hier.
// requireBoard() staat hier nogmaals naast de losse check in elke pagina
// zelf: onschuldig dubbelop, maar dekt ook een pagina af die die check
// ooit zou missen.
// Geen md:flex-row meer: BeheerSidebar's desktop-nav is zelf fixed (ze
// vervangt daar de gewone Sidebar, zie AppShell) en neemt dus geen
// flex-ruimte meer in — alleen de mobiele kolomstapeling hieronder is nog
// nodig voor het inklapbare mobiele zij-menu.
export default async function BeheerLayout({ children }: { children: ReactNode }) {
  const profile = await requireBoard();
  // Zelfde tellingen als "Wacht op jou" op het dashboard (zie
  // lib/beheer/waitingCounts.ts) — "Aanvragen" en "Gemelde berichten" tonen
  // hiermee precies dezelfde aantallen als daar, i.p.v. het losse
  // notificatie-gebaseerde getal dat deze twee plekken eerder uit elkaar
  // kon laten lopen.
  const counts = await getBeheerWaitingCounts();

  return (
    <div className="flex flex-col gap-6">
      <BeheerSidebar
        isAdmin={profile.role === "beheerder"}
        badges={{ "/beheer/instroom": counts.accessRequests, "/beheer/rapportages": counts.openReports }}
      />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
