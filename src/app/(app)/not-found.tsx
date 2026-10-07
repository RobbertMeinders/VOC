import { NotFoundContent } from "@/components/ui/NotFoundContent";

// Rendert als children van (app)/layout.tsx — dus automatisch binnen
// AppShell (sidebar/bottom-nav blijven staan), zonder dat dit bestand zelf
// iets van die shell hoeft te regelen. Vangt notFound() uit dynamische
// routes (bv. /leden/[id] voor een niet-bestaand lid) en elke verder niet-
// matchende URL binnen deze groep.
export default function NotFound() {
  return <NotFoundContent />;
}
