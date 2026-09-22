import type { Metadata } from "next";
import { BackLink } from "@/components/ui/BackLink";
import { ActivityEditContent } from "@/components/agenda/ActivityEditContent";

export const metadata: Metadata = { title: "Activiteit bewerken" };

export default async function EditActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div>
      <BackLink href={`/agenda/${id}`} label="Terug naar activiteit" />
      <ActivityEditContent id={id} />
    </div>
  );
}
