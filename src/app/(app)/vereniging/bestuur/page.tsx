import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { BestuurContent } from "@/components/vereniging/BestuurContent";
import { VerenigingHero } from "@/components/vereniging/VerenigingHero";

export const metadata: Metadata = { title: "Bestuur" };

export default async function BestuurPage() {
  await requireProfile();

  return (
    <div className="flex flex-col gap-6">
      <VerenigingHero title="Bestuur" description="Maak kennis met het team achter VOC." />
      <BestuurContent />
      {/* UX-audit: een compacte, directe ingang naar het bestuur — i.p.v.
          dat een lid eerst zelf een adres uit een van de bestuurskaarten
          moet overnemen. */}
      <a
        href="mailto:info@vocveendam.nl"
        className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-muted"
      >
        <Mail size={16} className="text-petrol" />
        Vraag voor het bestuur? Mail naar{" "}
        <span className="font-semibold">info@vocveendam.nl</span>
      </a>
    </div>
  );
}
