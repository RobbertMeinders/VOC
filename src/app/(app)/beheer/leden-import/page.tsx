import type { Metadata } from "next";
import { requireBoard } from "@/lib/auth/session";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { BulkImportForm } from "@/components/invitations/BulkImportForm";

export const metadata: Metadata = { title: "Leden importeren" };

export default async function LedenImportPage() {
  await requireBoard();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Beheer", href: "/beheer" }, { label: "Leden importeren" }]} />
      <h1 className="mb-1 text-xl font-semibold text-foreground">Leden importeren</h1>
      <p className="mb-6 text-sm text-muted">
        Upload een CSV-bestand met bestaande ledengegevens (voornaam, achternaam, e-mail, telefoon, bedrijf,
        bezoekersadres, postcode, vestigingsplaats). Er wordt per rij een uitnodiging aangemaakt — zonder dat daar
        meteen een e-mail bij verstuurd wordt; een bedrijf dat nog niet bestaat wordt automatisch aangemaakt met
        het opgegeven adres. Bekijk en pas de gegevens hieronder aan voordat je importeert; de e-mail versturen
        doe je later, per lid, vanaf de uitnodigingenpagina.
      </p>

      <BulkImportForm />
    </div>
  );
}
