import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { BeheerBedrijvenContent } from "@/components/beheer/BeheerBedrijvenContent";

export const metadata: Metadata = { title: "Bedrijven" };

export default async function BeheerBedrijvenPage() {
  return (
    <div>
      <PageHeader title="Bedrijven" />

      <BeheerBedrijvenContent />
    </div>
  );
}
