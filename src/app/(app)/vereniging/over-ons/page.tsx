import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Briefcase, ChevronRight, Info, UsersRound } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { getOrgProfile } from "@/lib/settings/org-profile";
import { getAppSettings } from "@/lib/settings/app-settings";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { PageHeader } from "@/components/ui/PageHeader";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Over de vereniging" };

const LINKS = [
  { href: "/vereniging/bestuur", label: "Bestuur", description: "Wie er in het bestuur zit", icon: Briefcase },
  { href: "/vereniging/commissies", label: "Commissies", description: "Meld je aan voor een commissie", icon: UsersRound },
];

export default async function OverVerenigingPage() {
  await requireProfile();
  const [orgProfile, appSettings] = await Promise.all([getOrgProfile(), getAppSettings()]);
  const headerImageUrl = orgProfile.header_image_path ? await getSignedStorageUrl("news-images", orgProfile.header_image_path) : null;

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
      {headerImageUrl && (
        <div className="relative aspect-[21/9] w-full overflow-hidden rounded-2xl border border-border shadow-sm">
          <Image src={headerImageUrl} alt="" fill unoptimized priority className="object-cover" />
        </div>
      )}

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
        {LINKS.map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm transition-all duration-150 hover:border-voc-red/40 hover:shadow-md"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-voc-red-light text-voc-red-text">
              <Icon size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="truncate text-xs text-muted">{description}</p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-voc-red-text" />
          </Link>
        ))}
      </div>
    </div>
  );
}
