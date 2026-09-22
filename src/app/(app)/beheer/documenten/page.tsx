import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import DocumentenPage from "@/app/(app)/documenten/page";

export const metadata: Metadata = { title: "Documenten beheren" };

// Zelfde inhoud als de publieke /documenten-pagina (die heeft de upload-
// en verwijderknoppen al voor bestuur/beheer) — deze route is puur een
// kortere weg vanuit /beheer, geen aparte pagina om te onderhouden.
export default function BeheerDocumentenPage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Beheer", href: "/beheer" }, { label: "Documenten" }]} />
      <DocumentenPage searchParams={Promise.resolve({})} />
    </div>
  );
}
