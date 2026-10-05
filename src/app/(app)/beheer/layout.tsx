import type { ReactNode } from "react";
import { requireBoard } from "@/lib/auth/session";
import { BeheerSidebar } from "@/components/beheer/BeheerSidebar";

// Beheer-navigatie i.p.v. dat elke pagina zelf terugleidt naar het
// kaartjes-overzicht op /beheer — zie BeheerSidebar. Op desktop zit die
// navigatie in de hoofd-Sidebar zelf (schakelt om zodra je in /beheer/*
// zit), dus hier alleen nog de mobiele uitklap-knop boven de inhoud.
// requireBoard() staat hier nogmaals naast de losse check in elke pagina
// zelf: onschuldig dubbelop, maar dekt ook een pagina af die die check
// ooit zou missen.
export default async function BeheerLayout({ children }: { children: ReactNode }) {
  await requireBoard();

  return (
    <div className="flex flex-col gap-6">
      <BeheerSidebar />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
