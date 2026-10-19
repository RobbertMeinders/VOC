import type { Metadata } from "next";
import { getCompanyProfileTitle, CompanyProfileContent } from "@/components/company/CompanyProfileContent";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: await getCompanyProfileTitle(id) };
}

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <CompanyProfileContent id={id} />;
}
