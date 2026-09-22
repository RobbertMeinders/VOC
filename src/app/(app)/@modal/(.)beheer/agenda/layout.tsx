import type { ReactNode } from "react";
import { RouteOverlayPanel } from "@/components/ui/RouteOverlayPanel";

export default function BeheerAgendaOverlayLayout({ children }: { children: ReactNode }) {
  return <RouteOverlayPanel>{children}</RouteOverlayPanel>;
}
