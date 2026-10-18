import type { Metadata } from "next";
import Link from "next/link";
import { IdCard, Info, UsersRound } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { getOrgProfile } from "@/lib/settings/org-profile";
import { getAppSettings } from "@/lib/settings/app-settings";
import { PageHeader } from "@/components/ui/PageHeader";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Over de vereniging" };

export default async function OverVerenigingPage() {
  await requireProfile();
  const [orgProfile, appSettings] = await Promise.all([getOrgProfile(), getAppSettings()]);

  // Eén doorlopend tekstvlak i.p.v. drie apart gelabelde blokken
  // (Introductie/Missie/Visie) — het bestuur voegt zelf kopjes en structuur
  // toe in de tekst, dus is een visuele driedeling hier overbodig. De drie
  // velden blijven in Beheer gewoon drie losse invoervakken (OrgProfileForm);
  // alleen de weergave hier voegt ze samen.
  const paragraphs = [orgProfile.intro_text, orgProfile.mission_text, orgProfile.vision_text].filter((text): text is string =>
    Boolean(text)
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title="Over de vereniging" description={appSettings.org_name} />

      {paragraphs.length === 0 ? (
        <ComingSoon
          icon={Info}
          title="Nog geen inhoud"
          description="Het bestuur heeft deze pagina nog niet gevuld. Kom later nog eens terug."
        />
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 text-sm leading-relaxed text-foreground">
            {paragraphs.map((text, index) => (
              <p key={index} className="whitespace-pre-line">
                {text}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/vereniging/bestuur"
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm hover:border-voc-red/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-voc-red-light text-voc-red-text">
            <IdCard size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Bestuur</p>
            <p className="text-xs text-muted">Wie er in het bestuur zit</p>
          </div>
        </Link>
        <Link
          href="/vereniging/commissies"
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm hover:border-voc-red/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-voc-red-light text-voc-red-text">
            <UsersRound size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Commissies</p>
            <p className="text-xs text-muted">Meld je aan voor een commissie</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
