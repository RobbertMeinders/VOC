import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ActivityEditContent } from "@/components/agenda/ActivityEditContent";

export const metadata: Metadata = { title: "Activiteit bewerken" };

export default async function EditActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div>
      <Breadcrumbs items={[{ label: "Agenda", href: "/agenda" }, { label: "Bewerken" }]} />
      <ActivityEditContent id={id} />
    </div>
  );
}
