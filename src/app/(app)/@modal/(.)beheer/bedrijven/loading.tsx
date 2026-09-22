import { RouteOverlayPanel } from "@/components/ui/RouteOverlayPanel";
import { OverlayLoading } from "@/components/ui/OverlayLoading";

export default function BeheerBedrijvenOverlayLoading() {
  return (
    <RouteOverlayPanel closeHref="/beheer">
      <OverlayLoading />
    </RouteOverlayPanel>
  );
}
