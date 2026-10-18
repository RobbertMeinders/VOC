import { redirect } from "next/navigation";

// Samengevoegd met Bestuur/Commissies tot tabs op één pagina
// (/beheer/vereniging) — deze route blijft bestaan als redirect voor
// bestaande links/bladwijzers.
export default function OverVerenigingAdminPage() {
  redirect("/beheer/vereniging?tab=over-ons");
}
