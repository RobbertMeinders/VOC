import { RouteOverlayPanel } from "@/components/ui/RouteOverlayPanel";
import DocumentenPage from "@/app/(app)/documenten/page";

export default function BeheerDocumentenModal() {
  return (
    <RouteOverlayPanel>
      <DocumentenPage searchParams={Promise.resolve({})} />
    </RouteOverlayPanel>
  );
}
