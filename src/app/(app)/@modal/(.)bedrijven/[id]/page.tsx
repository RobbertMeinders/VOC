import { CompanyProfileContent } from "@/components/company/CompanyProfileContent";

export default async function CompanyProfileModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <CompanyProfileContent id={id} />;
}
