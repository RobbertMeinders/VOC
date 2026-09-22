import type { Metadata } from "next";
import { getMemberProfileTitle, MemberProfileContent } from "@/components/members/MemberProfileContent";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: await getMemberProfileTitle(id) };
}

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="mx-auto w-full md:max-w-3xl">
      <MemberProfileContent id={id} />
    </div>
  );
}
