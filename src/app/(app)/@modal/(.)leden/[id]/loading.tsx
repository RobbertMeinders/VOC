import { RouteOverlayPanel } from "@/components/ui/RouteOverlayPanel";
import { OverlayLoading } from "@/components/ui/OverlayLoading";

export default function MemberOverlayLoading() {
  return (
    <RouteOverlayPanel closeHref="/leden">
      <OverlayLoading />
    </RouteOverlayPanel>
  );
}
