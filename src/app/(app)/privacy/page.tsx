import type { Metadata } from "next";
import { BackLink } from "@/components/ui/BackLink";
import { getAppSettings } from "@/lib/settings/app-settings";
import { renderLiteMarkdown } from "@/lib/text/renderLiteMarkdown";

export const metadata: Metadata = { title: "Privacy & veiligheid" };

export default async function PrivacyVeiligheidPage() {
  const settings = await getAppSettings();

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/instellingen" label="Terug naar Instellingen" />
      <h1 className="mb-4 font-display text-[1.75rem] font-extrabold tracking-[-0.03em] text-foreground sm:text-[2rem]">Privacy & veiligheid</h1>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        {renderLiteMarkdown(settings.privacy_content)}
      </div>
    </div>
  );
}
