import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { BeheerBedrijvenContent } from "@/components/beheer/BeheerBedrijvenContent";

export const metadata: Metadata = { title: "Bedrijven beheren" };

export default async function BeheerBedrijvenPage() {
  return (
    <div>
      <PageHeader
        title="Bedrijven beheren"
        description="Bedrijfsprofiel snel aanpassen en factuuradres/btw-nummer inzien, direct vanuit dit overzicht."
      />

      <BeheerBedrijvenContent />
    </div>
  );
}
