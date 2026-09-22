import { RouteOverlayPanel } from "@/components/ui/RouteOverlayPanel";
import DocumentenPage from "@/app/(app)/documenten/page";

export default function BeheerDocumentenModal() {
  return (
    <RouteOverlayPanel closeHref="/beheer">
      <DocumentenPage searchParams={Promise.resolve({})} />
    </RouteOverlayPanel>
  );
}
