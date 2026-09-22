import { RouteOverlayPanel } from "@/components/ui/RouteOverlayPanel";
import { BeheerAgendaContent } from "@/components/beheer/BeheerAgendaContent";

export default function BeheerAgendaModal() {
  return (
    <RouteOverlayPanel closeHref="/beheer">
      <BeheerAgendaContent />
    </RouteOverlayPanel>
  );
}
