import type { Metadata } from "next";
import { BeheerAgendaContent } from "@/components/beheer/BeheerAgendaContent";

export const metadata: Metadata = { title: "Agenda beheren" };

export default function BeheerAgendaPage() {
  return <BeheerAgendaContent />;
}
