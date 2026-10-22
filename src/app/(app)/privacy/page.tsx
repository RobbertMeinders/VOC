import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAppSettings } from "@/lib/settings/app-settings";
import { renderLiteMarkdown } from "@/lib/text/renderLiteMarkdown";

export const metadata: Metadata = { title: "Privacy & veiligheid" };

export default async function PrivacyVeiligheidPage() {
  const settings = await getAppSettings();

  return (
    <div>
      <PageHeader title="Privacy & veiligheid" back={{ href: "/instellingen", label: "Terug naar Instellingen" }} />

      <div className="flex flex-col gap-4 rounded-2xl bg-surface p-6 shadow-sm sm:p-8">
        {renderLiteMarkdown(settings.privacy_content)}
      </div>
    </div>
  );
}
