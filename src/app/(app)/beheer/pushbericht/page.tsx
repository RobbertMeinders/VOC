import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { PushBroadcastForm } from "@/components/beheer/PushBroadcastForm";

export const metadata: Metadata = { title: "Handmatig pushbericht" };

export default async function PushberichtPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Handmatig pushbericht"
        description="Verstuur direct een pushbericht naar alle actieve abonnementen — los van de automatische notificaties, en zonder de persoonlijke meldingsvoorkeuren van leden."
      />

      <PushBroadcastForm />
    </div>
  );
}
