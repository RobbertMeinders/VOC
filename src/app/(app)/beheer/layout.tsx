import type { ReactNode } from "react";
import { requireBoard } from "@/lib/auth/session";
import { BeheerSidebar } from "@/components/beheer/BeheerSidebar";

// Permanent zij-menu voor de hele /beheer-sectie i.p.v. dat elke pagina
// zelf terugleidt naar het kaartjes-overzicht op /beheer — zie
// BeheerSidebar. De bredere, niet-gecentreerde paginabreedte voor alle
// /beheer/*-routes zit in AppShell zelf (op pathname bepaald), niet hier.
// requireBoard() staat hier nogmaals naast de losse check in elke pagina
// zelf: onschuldig dubbelop, maar dekt ook een pagina af die die check
// ooit zou missen.
export default async function BeheerLayout({ children }: { children: ReactNode }) {
  const profile = await requireBoard();

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
      <BeheerSidebar isAdmin={profile.role === "beheerder"} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
