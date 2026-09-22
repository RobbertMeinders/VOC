import { RouteOverlayPanel } from "@/components/ui/RouteOverlayPanel";
import { ListLoadingSkeleton } from "@/components/ui/skeletons/OverlaySkeletons";

export default function BeheerAgendaOverlayLoading() {
  return (
    <RouteOverlayPanel closeHref="/beheer">
      <ListLoadingSkeleton />
    </RouteOverlayPanel>
  );
}
