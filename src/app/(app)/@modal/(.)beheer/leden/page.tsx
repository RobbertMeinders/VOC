import { RouteOverlayPanel } from "@/components/ui/RouteOverlayPanel";
import { BeheerLedenContent } from "@/components/beheer/BeheerLedenContent";

export default function BeheerLedenModal() {
  return (
    <RouteOverlayPanel closeHref="/beheer">
      <BeheerLedenContent />
    </RouteOverlayPanel>
  );
}
