import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { BestuurContent } from "@/components/vereniging/BestuurContent";

export const metadata: Metadata = { title: "Bestuur" };

export default async function BestuurPage() {
  await requireProfile();

  return (
    <div className="flex flex-col gap-6">
      {/* Zelfde kleurrijke merkkop-stijl als Over de vereniging (zonder
          headerfoto) i.p.v. een kale PageHeader-titel — geeft de
          Vereniging-pagina's een herkenbare, wat levendigere opening.
          Redesign: rode hero's worden donkerpetrol. */}
      <div
        className="animate-rise-in overflow-hidden rounded-2xl border border-border p-6 shadow-sm sm:p-10"
        style={{ backgroundImage: "var(--hero-gradient)" }}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-white/75">Vereniging</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-[-0.03em] text-white sm:text-3xl">Bestuur</h1>
        <p className="mt-1 text-sm text-white/80">Maak kennis met het team achter VOC.</p>
      </div>
      <BestuurContent />
    </div>
  );
}
