import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { BeheerAgendaContent } from "@/components/beheer/BeheerAgendaContent";

export const metadata: Metadata = { title: "Agenda beheren" };

export default function BeheerAgendaPage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Beheer", href: "/beheer" }, { label: "Activiteiten" }]} />
      <BeheerAgendaContent />
    </div>
  );
}
