import { RouteOverlayPanel } from "@/components/ui/RouteOverlayPanel";
import { FormLoadingSkeleton } from "@/components/ui/skeletons/OverlaySkeletons";

export default function ActivityEditOverlayLoading() {
  return (
    <RouteOverlayPanel>
      <FormLoadingSkeleton />
    </RouteOverlayPanel>
  );
}
