import { redirect } from "next/navigation";

// Automatische berichten (relayed opdracht, voorbeeld docs/design/
// automatische-berichten/index.html leidend): samengevoegd met de
// pushtemplates tot één tabblad per bericht in Portaalinstellingen
// (message_templates, migratie 0129) — deze route blijft bestaan als
// redirect voor bestaande links/bladwijzers.
export default function EmailTemplatesPage() {
  redirect("/beheer/instellingen?tab=berichten");
}
