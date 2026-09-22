import type { Metadata } from "next";
import { getActivityTitle, ActivityDetailContent } from "@/components/agenda/ActivityDetailContent";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: await getActivityTitle(id) };
}

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ActivityDetailContent id={id} />;
}
