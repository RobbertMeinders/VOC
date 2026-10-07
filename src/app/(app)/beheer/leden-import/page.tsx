import { redirect } from "next/navigation";

// UX-review Deel 5: samengevoegd met Aanvragen/Uitnodigingen/Potentiële
// leden tot tabs op één pagina (/beheer/instroom) — deze route blijft
// bestaan als redirect voor bestaande links/bladwijzers.
export default function LedenImportPage() {
  redirect("/beheer/instroom?tab=import");
}
