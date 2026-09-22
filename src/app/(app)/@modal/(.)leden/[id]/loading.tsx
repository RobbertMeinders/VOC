import { RouteOverlayPanel } from "@/components/ui/RouteOverlayPanel";
import { DetailSkeleton } from "@/components/ui/skeletons/OverlaySkeletons";

export default function MemberOverlayLoading() {
  return (
    <RouteOverlayPanel>
      <DetailSkeleton />
    </RouteOverlayPanel>
  );
}
