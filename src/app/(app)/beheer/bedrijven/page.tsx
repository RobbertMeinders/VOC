import type { Metadata } from "next";
import { BeheerBedrijvenContent } from "@/components/beheer/BeheerBedrijvenContent";

export const metadata: Metadata = { title: "Bedrijven beheren" };

export default function BeheerBedrijvenPage() {
  return <BeheerBedrijvenContent />;
}
