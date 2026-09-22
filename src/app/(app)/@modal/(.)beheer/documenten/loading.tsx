import { RouteOverlayPanel } from "@/components/ui/RouteOverlayPanel";
import { OverlayLoading } from "@/components/ui/OverlayLoading";

export default function BeheerDocumentenOverlayLoading() {
  return (
    <RouteOverlayPanel closeHref="/beheer">
      <OverlayLoading />
    </RouteOverlayPanel>
  );
}
