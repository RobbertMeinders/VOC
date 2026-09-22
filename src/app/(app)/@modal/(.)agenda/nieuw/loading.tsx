import { RouteOverlayPanel } from "@/components/ui/RouteOverlayPanel";
import { FormLoadingSkeleton } from "@/components/ui/skeletons/OverlaySkeletons";

export default function NewActivityOverlayLoading() {
  return (
    <RouteOverlayPanel closeHref="/agenda">
      <FormLoadingSkeleton />
    </RouteOverlayPanel>
  );
}
