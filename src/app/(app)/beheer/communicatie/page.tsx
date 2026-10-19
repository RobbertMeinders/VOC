import type { Metadata } from "next";
import { Megaphone, Plus } from "lucide-react";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageHeader } from "@/components/ui/PageHeader";
import { CommunicationRow } from "@/components/beheer/CommunicationRow";
import { getAppSettings } from "@/lib/settings/app-settings";
import { createCommunicationAction } from "./actions";
import type { Database } from "@/lib/types/database";

export const metadata: Metadata = { title: "Nieuwsbrieven" };

type Communication = Database["public"]["Tables"]["communications"]["Row"] & {
  activity: { title: string } | null;
};

// B4 (nieuwsbriefsysteem-plan): geen eigen Notificatieregels-tabblad meer
// hier — dat gaat over automatische meldingen, niet over nieuwsbrieven, en
// staat nu op Beheer -> Portaalinstellingen. Drie groepen i.p.v. twee:
// Concepten (incl. een mislukte of vastgelopen verzendpoging — die zijn nog
// actie nodig), Ingepland, Verzonden.
export default async function BeheerCommunicatiePage() {
  await requireBoard();
  const supabase = await createClient();

  const [{ data: communications }, settings] = await Promise.all([
    supabase.from("communications").select("*, activity:activities(title)").order("created_at", { ascending: false }).returns<Communication[]>(),
    getAppSettings(),
  ]);

  const concepten = (communications ?? []).filter((c) => c.status === "concept" || c.status === "verzenden_mislukt" || c.status === "versturen");
  const ingepland = (communications ?? []).filter((c) => c.status === "ingepland");
  const verzonden = (communications ?? []).filter((c) => c.status === "verzonden");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Nieuwsbrieven" description="Nieuwsbriefcampagnes maken, inplannen en versturen." />

      <div className="flex w-full flex-wrap items-center justify-end gap-2">
        <form action={createCommunicationAction} className="flex-1 sm:flex-none">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-black/[.03] dark:hover:bg-white/[.06] sm:w-auto"
          >
            <Plus size={16} />
            Nieuwe nieuwsbrief
          </button>
        </form>
      </div>

      {(communications ?? []).length === 0 ? (
        <ComingSoon icon={Megaphone} title="Nog geen nieuwsbrieven" />
      ) : (
        <>
          <div>
            <h2 className="mb-2 text-sm font-semibold text-foreground">Concepten</h2>
            {concepten.length > 0 ? (
              <div className="flex flex-col gap-2">
                {concepten.map((c) => (
                  <CommunicationRow key={c.id} communication={c} orgName={settings.org_name} logoUrl={settings.logo_url} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Geen openstaande concepten.</p>
            )}
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-foreground">Ingepland</h2>
            {ingepland.length > 0 ? (
              <div className="flex flex-col gap-2">
                {ingepland.map((c) => (
                  <CommunicationRow key={c.id} communication={c} orgName={settings.org_name} logoUrl={settings.logo_url} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Niets ingepland.</p>
            )}
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-foreground">Verzonden</h2>
            {verzonden.length > 0 ? (
              <div className="flex flex-col gap-2">
                {verzonden.map((c) => (
                  <CommunicationRow key={c.id} communication={c} orgName={settings.org_name} logoUrl={settings.logo_url} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Nog niets verzonden.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
