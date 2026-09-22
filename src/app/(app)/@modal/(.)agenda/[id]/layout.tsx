import type { ReactNode } from "react";
import { RouteOverlayPanel } from "@/components/ui/RouteOverlayPanel";

// Dekt zowel /agenda/[id] als /agenda/[id]/bewerken (geneste route) — één
// paneel-instantie blijft gemonteerd terwijl je tussen die twee wisselt.
export default function ActivityOverlayLayout({ children }: { children: ReactNode }) {
  return <RouteOverlayPanel>{children}</RouteOverlayPanel>;
}
