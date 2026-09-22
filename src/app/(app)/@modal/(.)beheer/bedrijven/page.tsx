import { RouteOverlayPanel } from "@/components/ui/RouteOverlayPanel";
import { BeheerBedrijvenContent } from "@/components/beheer/BeheerBedrijvenContent";

export default function BeheerBedrijvenModal() {
  return (
    <RouteOverlayPanel>
      <BeheerBedrijvenContent />
    </RouteOverlayPanel>
  );
}
