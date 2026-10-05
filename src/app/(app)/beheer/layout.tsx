import type { ReactNode } from "react";
import { requireBoard } from "@/lib/auth/session";
import { BeheerSidebar } from "@/components/beheer/BeheerSidebar";

// Permanent zij-menu voor de hele /beheer-sectie i.p.v. dat elke pagina
// zelf terugleidt naar het kaartjes-overzicht op /beheer — zie
// BeheerSidebar. requireBoard() staat hier nogmaals naast de losse check in
// elke pagina zelf: onschuldig dubbelop, maar dekt ook een pagina af die
// die check ooit zou missen.
export default async function BeheerLayout({ children }: { children: ReactNode }) {
  await requireBoard();

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
      <BeheerSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
