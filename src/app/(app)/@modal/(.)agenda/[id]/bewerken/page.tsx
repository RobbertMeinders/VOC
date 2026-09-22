import { ActivityEditContent } from "@/components/agenda/ActivityEditContent";

export default async function ActivityEditModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ActivityEditContent id={id} />;
}
