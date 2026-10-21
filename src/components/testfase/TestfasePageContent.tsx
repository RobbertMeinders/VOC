import { redirect } from "next/navigation";
import { getAppSettings } from "@/lib/settings/app-settings";
import { TestfaseFeedbackForm } from "@/components/testfase/TestfaseFeedbackForm";
import { latestReleaseNote } from "@/lib/release-notes";

// Gedeeld tussen de volledige pagina (testfase/page.tsx) en de
// modal-overlay (@modal/(.)testfase/page.tsx) — zelfde patroon als
// CompanyProfileContent voor bedrijven. Staat de testfase-schakelaar uit,
// dan is een redirect naar Home hier ook binnen de modal het juiste
// gedrag: de link die hiernaartoe leidt staat dan toch al nergens meer.
export async function TestfasePageContent({ van }: { van?: string }) {
  const appSettings = await getAppSettings();
  if (!appSettings.show_testfase) {
    redirect("/");
  }
  const latest = latestReleaseNote();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-1 font-display text-[1.75rem] font-extrabold tracking-[-0.03em] text-foreground sm:text-[2rem]">
          Over het ledenportaal
        </h1>
        <p className="text-sm text-muted">
          Je gebruikt de proefversie van het ledenportaal. Je kunt al bijna alles gebruiken, maar een paar dingen
          lopen nog via de oude weg:
        </p>
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

      {latest && (
        <div className="rounded-2xl bg-surface p-6 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Wat is er nieuw in versie {latest.version}</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {latest.items.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-muted">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-3 text-sm text-foreground">Loopt er iets mis of heb je een idee? Laat het hieronder weten. We lezen alles.</p>
        <TestfaseFeedbackForm van={van} />
      </div>
    </div>
  );
}
