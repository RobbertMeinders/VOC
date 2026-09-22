import { RouteOverlayPanel } from "@/components/ui/RouteOverlayPanel";
import { MemberProfileContent } from "@/components/members/MemberProfileContent";

// Intercepting route: wanneer je vanuit de app (bv. de ledenlijst, een
// bericht, een notificatie) naar /leden/[id] navigeert, vervangt Next.js
// deze route i.p.v. de volledige pagina onder app/(app)/leden/[id]/page.tsx
// — die laatste blijft de "echte" pagina voor een directe link/refresh/deep
// link (bv. vanuit een notificatie-e-mail).
export default async function MemberProfileModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <RouteOverlayPanel closeHref="/leden">
      <MemberProfileContent id={id} />
    </RouteOverlayPanel>
  );
}
