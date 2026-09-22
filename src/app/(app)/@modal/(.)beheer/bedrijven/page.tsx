import { BeheerBedrijvenContent } from "@/components/beheer/BeheerBedrijvenContent";

export default function BeheerBedrijvenModal({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return <BeheerBedrijvenContent searchParams={searchParams} />;
}
