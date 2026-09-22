import { RouteOverlayPanel } from "@/components/ui/RouteOverlayPanel";
import { OverlayLoading } from "@/components/ui/OverlayLoading";

export default function ActivityOverlayLoading() {
  return (
    <RouteOverlayPanel closeHref="/agenda">
      <OverlayLoading />
    </RouteOverlayPanel>
  );
}
