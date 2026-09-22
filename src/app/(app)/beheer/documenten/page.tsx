import type { Metadata } from "next";
import DocumentenPage from "@/app/(app)/documenten/page";

export const metadata: Metadata = { title: "Documenten beheren" };

// Zelfde inhoud als de publieke /documenten-pagina (die heeft de upload-
// en verwijderknoppen al voor bestuur/beheer) — deze route is puur een
// kortere weg vanuit /beheer, geen aparte pagina om te onderhouden.
export default function BeheerDocumentenPage() {
  return <DocumentenPage searchParams={Promise.resolve({})} />;
}
