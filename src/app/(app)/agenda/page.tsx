import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Agenda" };

export default function AgendaPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-foreground">Agenda</h1>
      <ComingSoon
        icon={CalendarDays}
        title="Agenda volgt in fase 4"
        description="Hier vind je straks alle VOC-activiteiten en kun je je aan- en afmelden."
      />
    </div>
  );
}
