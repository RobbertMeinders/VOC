import { requireProfile } from "@/lib/auth/session";
import { isBoard } from "@/lib/auth/roles";
import { RouteOverlayPanel } from "@/components/ui/RouteOverlayPanel";
import { NewActivityFlow } from "@/components/agenda/NewActivityFlow";

export default async function NewActivityModal() {
  const profile = await requireProfile();

  return (
    <RouteOverlayPanel>
      <NewActivityFlow board={isBoard(profile.role)} />
    </RouteOverlayPanel>
  );
}
