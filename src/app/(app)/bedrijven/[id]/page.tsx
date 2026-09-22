import type { Metadata } from "next";
import { getCompanyProfileTitle, CompanyProfileContent } from "@/components/company/CompanyProfileContent";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: await getCompanyProfileTitle(id) };
}

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="mx-auto w-full md:max-w-3xl">
      <CompanyProfileContent id={id} />
    </div>
  );
}
