import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { BestuurContent } from "@/components/vereniging/BestuurContent";
import { VerenigingHero } from "@/components/vereniging/VerenigingHero";

export const metadata: Metadata = { title: "Bestuur" };

export default async function BestuurPage() {
  await requireProfile();

  return (
    <div className="flex flex-col gap-6">
      {/* UX-review feedback-ronde 2 punt 7: de losse "vraag voor het
          bestuur"-mailstrip oogde te grof/afstandelijk en is verwijderd. */}
      <VerenigingHero title="Bestuur" description="Maak kennis met het team achter VOC." />
      <BestuurContent />
    </div>
  );
}
