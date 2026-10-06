import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { getAppSettings } from "@/lib/settings/app-settings";
import { AppSettingsForm } from "@/components/beheer/AppSettingsForm";

export const metadata: Metadata = { title: "App-instellingen" };

export default async function AppSettingsPage() {
  await requireAdmin();
  const settings = await getAppSettings();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">App-instellingen</h1>
        <p className="text-sm text-muted">Naam, logo en verenigingsnaam van het ledenportaal — zichtbaar voor alle leden.</p>
      </div>

      <AppSettingsForm settings={settings} />
    </div>
  );
}
