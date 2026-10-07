import { redirect } from "next/navigation";

// UX-review Deel 5: samengevoegd met Aanvragen/Potentiële leden/Leden
// importeren tot tabs op één pagina (/beheer/instroom) — deze route blijft
// bestaan als redirect voor bestaande links/bladwijzers. actions.ts op dit
// pad blijft ongewijzigd (andere bestanden importeren daarvandaan).
export default function UitnodigingenPage() {
  redirect("/beheer/instroom?tab=uitnodigingen");
}
