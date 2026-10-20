import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Info, Sparkles, UserCheck, UsersRound } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { getOrgProfile } from "@/lib/settings/org-profile";
import { getAppSettings } from "@/lib/settings/app-settings";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Over de vereniging" };

const LINKS = [
  { href: "/vereniging/bestuur", label: "Bestuur", description: "Wie er in het bestuur zit", icon: UserCheck },
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
  // alleen de weergave hier voegt ze samen. De eerste alinea (altijd de
  // Introductie) krijgt wel een iets groter "lead"-lettertype — dat is geen
  // nieuwe driedeling, gewoon wat ritme in een anders vlakke tekstmuur.
  const paragraphs = [orgProfile.intro_text, orgProfile.mission_text, orgProfile.vision_text].filter((text): text is string =>
    Boolean(text)
  );

  // Titel staat voortaan óp de headerfoto zelf (als die er is) i.p.v.
  // erboven — dat voelt minder als "foto, dan los kopje" en meer als één
  // samenhangende opening. Zonder foto valt de pagina terug op een
  // kleurrijke merkkop i.p.v. gewoon kale platte tekst, zodat de pagina
  // ook dan meteen iets te zien heeft.
  const hero = headerImageUrl ? (
    <div className="animate-rise-in relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border shadow-sm sm:aspect-[21/9]">
      <Image src={headerImageUrl} alt="" fill unoptimized priority className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
        <p className="text-xs font-medium uppercase tracking-wide text-white/80">{appSettings.org_name}</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-[-0.03em] text-white sm:text-3xl">Over de vereniging</h1>
      </div>
    </div>
  ) : (
    <div
      className="animate-rise-in overflow-hidden rounded-2xl border border-border p-6 shadow-sm sm:p-10"
      style={{ backgroundImage: "var(--hero-gradient)" }}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-white/75">{appSettings.org_name}</p>
      <h1 className="mt-1 font-display text-2xl font-extrabold tracking-[-0.03em] text-white sm:text-3xl">Over de vereniging</h1>
    </div>
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {hero}

      {paragraphs.length === 0 ? (
        <ComingSoon
          icon={Info}
          title="Nog geen inhoud"
          description="Het bestuur heeft deze pagina nog niet gevuld. Kom later nog eens terug."
        />
      ) : (
        <div className="animate-rise-in rounded-2xl bg-surface p-6 shadow-sm sm:p-8">
          <div className="mb-4 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-petrol">
            <Sparkles size={14} />
            Wie we zijn
          </div>
          <div className="flex flex-col gap-4 leading-relaxed text-foreground">
            {paragraphs.map((text, index) => (
              <p key={index} className={index === 0 ? "whitespace-pre-line text-base font-medium" : "whitespace-pre-line text-sm text-muted"}>
                {text}
              </p>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Meer over VOC</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {LINKS.map(({ href, label, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="animate-rise-in group flex items-center gap-4 rounded-2xl bg-surface p-5 shadow-sm transition-all duration-150 hover:border-foreground/20 hover:shadow-md"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-petrol-soft text-petrol">
                <Icon size={24} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="truncate text-xs text-muted">{description}</p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-petrol" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
