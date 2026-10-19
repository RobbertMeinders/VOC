import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { getAppSettings } from "@/lib/settings/app-settings";
import { PageHeader } from "@/components/ui/PageHeader";
import { AppSettingsForm } from "@/components/beheer/AppSettingsForm";
import { ForceLogoutAllButton } from "@/components/beheer/ForceLogoutAllButton";

export const metadata: Metadata = { title: "Portaalinstellingen" };

export default async function AppSettingsPage() {
  await requireAdmin();
  const settings = await getAppSettings();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Portaalinstellingen"
        description="Naam, logo en verenigingsnaam van het ledenportaal - zichtbaar voor alle leden."
      />

      <AppSettingsForm settings={settings} />

      {/* Een los lid uitloggen staat bij dat lid zelf (Leden -> lid ->
          Beheer) — hier alleen de ingreep die alle leden tegelijk raakt. */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Gevaarlijke acties</h2>
        <p className="mb-4 text-xs text-muted">
          Alleen voor een vermoede gelekte sessie of ander beveiligingsincident.
        </p>
        <ForceLogoutAllButton />
      </div>
    </div>
  );
}
