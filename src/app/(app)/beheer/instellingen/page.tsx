import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { getAppSettings } from "@/lib/settings/app-settings";
import { PageHeader } from "@/components/ui/PageHeader";
import { AppSettingsForm } from "@/components/beheer/AppSettingsForm";

export const metadata: Metadata = { title: "App-instellingen" };

export default async function AppSettingsPage() {
  await requireAdmin();
  const settings = await getAppSettings();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="App-instellingen"
        description="Naam, logo en verenigingsnaam van het ledenportaal — zichtbaar voor alle leden."
      />

      <AppSettingsForm settings={settings} />
    </div>
  );
}
