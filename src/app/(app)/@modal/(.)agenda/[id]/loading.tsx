import { RouteOverlayPanel } from "@/components/ui/RouteOverlayPanel";
import { DetailSkeleton } from "@/components/ui/skeletons/OverlaySkeletons";

export default function ActivityOverlayLoading() {
  return (
    <RouteOverlayPanel closeHref="/agenda">
      <DetailSkeleton />
    </RouteOverlayPanel>
  );
}
