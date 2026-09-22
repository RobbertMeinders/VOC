import { ActivityDetailContent } from "@/components/agenda/ActivityDetailContent";

export default async function ActivityDetailModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ActivityDetailContent id={id} />;
}
