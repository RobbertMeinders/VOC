import type { Metadata } from "next";
import { ActivityEditContent } from "@/components/agenda/ActivityEditContent";

export const metadata: Metadata = { title: "Activiteit bewerken" };

export default async function EditActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ActivityEditContent id={id} />;
}
