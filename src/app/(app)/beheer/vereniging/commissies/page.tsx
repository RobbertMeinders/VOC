import { redirect } from "next/navigation";

// Samengevoegd met Over VOC/Bestuur tot tabs op één pagina
// (/beheer/vereniging) — deze route blijft bestaan als redirect voor
// bestaande links/bladwijzers.
export default function BeheerCommissiesPage() {
  redirect("/beheer/vereniging?tab=commissies");
}
