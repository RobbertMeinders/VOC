import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { BeheerBedrijvenContent } from "@/components/beheer/BeheerBedrijvenContent";

export const metadata: Metadata = { title: "Bedrijven beheren" };

export default function BeheerBedrijvenPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Beheer", href: "/beheer" }, { label: "Bedrijven" }]} />
      <BeheerBedrijvenContent searchParams={searchParams} />
    </div>
  );
}
