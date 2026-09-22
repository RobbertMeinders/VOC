import type { Metadata } from "next";
import { BackLink } from "@/components/ui/BackLink";
import { BeheerAgendaContent } from "@/components/beheer/BeheerAgendaContent";

export const metadata: Metadata = { title: "Agenda beheren" };

export default function BeheerAgendaPage() {
  return (
    <div>
      <BackLink href="/beheer" label="Terug naar Beheer" />
      <BeheerAgendaContent />
    </div>
  );
}
