import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { TestfasePageContent } from "@/components/testfase/TestfasePageContent";

export const metadata: Metadata = { title: "Over het ledenportaal" };

// H (onboarding-opdracht), content herschreven in Opdracht 2 (Proefversie
// i.p.v. testfase). De eigenlijke inhoud + de "staat de schakelaar uit"
// redirect zitten in TestfasePageContent, gedeeld met de modal-variant
// hieronder (@modal/(.)testfase) — zelfde opzet als bedrijven/[id].
export default async function TestfasePage({ searchParams }: { searchParams: Promise<{ van?: string }> }) {
  await requireProfile();
  const { van } = await searchParams;

  return <TestfasePageContent van={van} />;
}
