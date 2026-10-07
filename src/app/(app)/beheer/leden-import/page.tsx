import type { Metadata } from "next";
import { requireBoard } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BulkImportForm } from "@/components/invitations/BulkImportForm";

export const metadata: Metadata = { title: "Leden importeren" };

// bulkImportMembersAction (aangeroepen vanaf deze pagina) geocodeert elk
// nieuw bedrijf sequentieel, met ~1,1s pauze tussen aanroepen (Nominatims
// gebruiksvoorwaarden) — bij meerdere nieuwe bedrijven in één import loopt
// dat ruim boven de standaard functietijd.
export const maxDuration = 300;

export default async function LedenImportPage() {
  await requireBoard();

  return (
    <div>
      <PageHeader
        title="Leden importeren"
        description="Upload een CSV-bestand met bestaande ledengegevens (voornaam, achternaam, e-mail, telefoon, bedrijf, bezoekersadres, postcode, vestigingsplaats). Er wordt per rij een uitnodiging aangemaakt — zonder dat daar meteen een e-mail bij verstuurd wordt; een bedrijf dat nog niet bestaat wordt automatisch aangemaakt met het opgegeven adres. Bekijk en pas de gegevens hieronder aan voordat je importeert; de e-mail versturen doe je later, per lid, vanaf de uitnodigingenpagina."
      />

      <BulkImportForm />
    </div>
  );
}
