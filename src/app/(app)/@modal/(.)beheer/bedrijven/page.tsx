import { RouteOverlayPanel } from "@/components/ui/RouteOverlayPanel";
import { BeheerBedrijvenContent } from "@/components/beheer/BeheerBedrijvenContent";

export default function BeheerBedrijvenModal({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <RouteOverlayPanel>
      <BeheerBedrijvenContent searchParams={searchParams} />
    </RouteOverlayPanel>
  );
}
