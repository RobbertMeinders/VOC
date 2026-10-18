import type { Metadata } from "next";
import { Info } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { getOrgProfile } from "@/lib/settings/org-profile";
import { getAppSettings } from "@/lib/settings/app-settings";
import { PageHeader } from "@/components/ui/PageHeader";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Over VOC" };

function Section({ heading, text }: { heading: string; text: string | null }) {
  if (!text) return null;
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">{heading}</h2>
      <p className="mt-2 whitespace-pre-line text-sm text-muted">{text}</p>
    </div>
  );
}

export default async function OverVocPage() {
  await requireProfile();
  const [orgProfile, appSettings] = await Promise.all([getOrgProfile(), getAppSettings()]);
  const hasContent = Boolean(orgProfile.intro_text || orgProfile.mission_text || orgProfile.vision_text);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Over VOC" description={appSettings.org_name} />

      {!hasContent && (
        <ComingSoon
          icon={Info}
          title="Nog geen inhoud"
          description="Het bestuur heeft deze pagina nog niet gevuld. Kom later nog eens terug."
        />
      )}

      <Section heading="Introductie" text={orgProfile.intro_text} />
      <Section heading="Missie" text={orgProfile.mission_text} />
      <Section heading="Visie" text={orgProfile.vision_text} />
    </div>
  );
}
