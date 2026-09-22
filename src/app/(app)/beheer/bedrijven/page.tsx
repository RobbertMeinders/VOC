import type { Metadata } from "next";
import { BackLink } from "@/components/ui/BackLink";
import { BeheerBedrijvenContent } from "@/components/beheer/BeheerBedrijvenContent";

export const metadata: Metadata = { title: "Bedrijven beheren" };

export default function BeheerBedrijvenPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div>
      <BackLink href="/beheer" label="Terug naar Beheer" />
      <BeheerBedrijvenContent searchParams={searchParams} />
    </div>
  );
}
