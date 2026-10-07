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

export const metadata: Metadata = { title: "Communicatie" };

type Communication = Database["public"]["Tables"]["communications"]["Row"] & {
  activity: { title: string } | null;
};

export default async function BeheerCommunicatiePage() {
  await requireBoard();
  const supabase = await createClient();

  const [{ data: communications }, settings] = await Promise.all([
    supabase.from("communications").select("*, activity:activities(title)").order("created_at", { ascending: false }).returns<Communication[]>(),
    getAppSettings(),
  ]);

  const concepten = (communications ?? []).filter((c) => c.status !== "verzonden");
  const verzonden = (communications ?? []).filter((c) => c.status === "verzonden");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Communicatie"
        description="Centrale plek voor campagnes en algemene e-mailcommunicatie naar leden."
        action={
          <form action={createCommunicationAction}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1.5 rounded-full bg-voc-red px-3 py-1.5 text-sm font-medium text-white hover:bg-voc-red-dark sm:w-auto"
            >
              <Plus size={16} />
              Nieuwe campagne
            </button>
          </form>
        }
      />

      {(communications ?? []).length === 0 ? (
        <ComingSoon
          icon={Megaphone}
          title="Nog geen communicatie"
          description="Plaats hier je eerste campagne, of ga naar een evenement en kies “Communiceer over dit evenement”."
        />
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
