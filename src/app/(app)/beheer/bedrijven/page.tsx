import type { Metadata } from "next";
import { BeheerBedrijvenContent } from "@/components/beheer/BeheerBedrijvenContent";

export const metadata: Metadata = { title: "Bedrijven beheren" };

// regeocodeMissingCompaniesAction (RegeocodeCompaniesButton) geocodeert
// sequentieel met ~1,1s pauze tussen aanroepen (Nominatims
// gebruiksvoorwaarden) — bij meerdere bedrijven zonder coördinaten loopt
// dat ruim boven de standaard functietijd.
export const maxDuration = 300;

export default function BeheerBedrijvenPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return <BeheerBedrijvenContent searchParams={searchParams} />;
}
