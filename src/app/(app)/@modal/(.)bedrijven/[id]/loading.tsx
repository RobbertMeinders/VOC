import { RouteOverlayPanel } from "@/components/ui/RouteOverlayPanel";
import { DetailSkeleton } from "@/components/ui/skeletons/OverlaySkeletons";

export default function CompanyOverlayLoading() {
  return (
    <RouteOverlayPanel>
      <DetailSkeleton />
    </RouteOverlayPanel>
  );
}
