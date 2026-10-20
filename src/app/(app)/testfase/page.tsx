import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { getAppSettings } from "@/lib/settings/app-settings";
import { TestfaseFeedbackForm } from "@/components/testfase/TestfaseFeedbackForm";

export const metadata: Metadata = { title: "Over de testfase" };

// H (onboarding-opdracht): vaste tekst, letterlijk zoals aangeleverd. Staat
// uit achter de "Testfase tonen"-schakelaar (Beheer -> Portaalinstellingen)
// — uit betekent een redirect naar Home, niet een lege/verborgen pagina op
// dezelfde route (een directe link zou anders een inhoudsloze pagina tonen).
export default async function TestfasePage({ searchParams }: { searchParams: Promise<{ van?: string }> }) {
  await requireProfile();
  const appSettings = await getAppSettings();
  if (!appSettings.show_testfase) {
    redirect("/");
  }
  const { van } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-1 font-display text-[1.75rem] font-extrabold tracking-[-0.03em] text-foreground sm:text-[2rem]">
          Over de testfase
        </h1>
        <p className="text-sm text-muted">Fijn dat je meetest. Je kunt alles al gebruiken, maar dit loopt nog via de oude weg:</p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-surface p-6 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-foreground">Aanmelden voor activiteiten</p>
          <p className="mt-0.5 text-sm text-muted">telt nog niet officieel. Meld je ook aan via de website.</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Nieuwsbrieven</p>
          <p className="mt-0.5 text-sm text-muted">komen nog niet uit het portaal.</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Koppelingen met de website</p>
          <p className="mt-0.5 text-sm text-muted">staan nog niet live.</p>
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm text-foreground">Loopt er iets mis of heb je een idee? Laat het hieronder weten. We lezen alles.</p>
        <TestfaseFeedbackForm van={van} />
      </div>
    </div>
  );
}
