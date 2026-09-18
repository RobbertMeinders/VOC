import type { Metadata } from "next";
import { Users } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Leden" };

export default function LedenPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-foreground">Leden</h1>
      <ComingSoon
        icon={Users}
        title="Ledenlijst volgt in fase 2"
        description="Hier kun je straks alle VOC-leden en bedrijven doorzoeken en hun profiel bekijken."
      />
    </div>
  );
}
