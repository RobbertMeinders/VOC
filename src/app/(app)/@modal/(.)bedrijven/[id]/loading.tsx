import { RouteOverlayPanel } from "@/components/ui/RouteOverlayPanel";
import { OverlayLoading } from "@/components/ui/OverlayLoading";

export default function CompanyOverlayLoading() {
  return (
    <RouteOverlayPanel closeHref="/bedrijven">
      <OverlayLoading />
    </RouteOverlayPanel>
  );
}
