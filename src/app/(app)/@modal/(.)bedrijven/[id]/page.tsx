import { RouteOverlayPanel } from "@/components/ui/RouteOverlayPanel";
import { CompanyProfileContent } from "@/components/company/CompanyProfileContent";

export default async function CompanyProfileModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <RouteOverlayPanel>
      <CompanyProfileContent id={id} />
    </RouteOverlayPanel>
  );
}
