import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { PushBroadcastForm } from "@/components/beheer/PushBroadcastForm";

export const metadata: Metadata = { title: "Handmatig pushbericht" };

export default async function PushberichtPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Handmatig pushbericht</h1>
        <p className="text-sm text-muted">
          Verstuur direct een pushbericht naar alle actieve abonnementen — los van de automatische
          notificaties, en zonder de persoonlijke meldingsvoorkeuren van leden.
        </p>
      </div>

      <PushBroadcastForm />
    </div>
  );
}
