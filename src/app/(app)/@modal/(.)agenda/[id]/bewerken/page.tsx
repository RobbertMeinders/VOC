import { RouteOverlayPanel } from "@/components/ui/RouteOverlayPanel";
import { ActivityEditContent } from "@/components/agenda/ActivityEditContent";

export default async function ActivityEditModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <RouteOverlayPanel>
      <ActivityEditContent id={id} />
    </RouteOverlayPanel>
  );
}
