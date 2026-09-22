import { RouteOverlayPanel } from "@/components/ui/RouteOverlayPanel";
import { ActivityDetailContent } from "@/components/agenda/ActivityDetailContent";

export default async function ActivityDetailModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <RouteOverlayPanel closeHref="/agenda">
      <ActivityDetailContent id={id} />
    </RouteOverlayPanel>
  );
}
