import { redirect } from "next/navigation";

// Samengevoegd met Over VOC/Commissies tot tabs op één pagina
// (/beheer/vereniging) — deze route blijft bestaan als redirect voor
// bestaande links/bladwijzers.
export default function BeheerBestuurPage() {
  redirect("/beheer/vereniging?tab=bestuur");
}
