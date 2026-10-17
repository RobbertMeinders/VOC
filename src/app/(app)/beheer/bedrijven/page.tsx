import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { Building2, Receipt } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { BeheerBedrijvenContent } from "@/components/beheer/BeheerBedrijvenContent";
import { BeheerFactuurgegevensContent } from "@/components/beheer/BeheerFactuurgegevensContent";

export const metadata: Metadata = { title: "Bedrijven beheren" };

// Zelfde tabs-op-één-pagina-patroon als /beheer/instroom: factuurgegevens
// horen niet tussen bedrijfsprofiel-velden (branche/plaats) in het
// standaardoverzicht — een boekhouder wil juist alléén btw-nummers/
// factuuradressen zien, zonder dat door bedrijfsprofielvelden heen te
// hoeven scrollen.
const TABS = [
  { key: "overzicht", label: "Overzicht", icon: Building2 },
  { key: "factuurgegevens", label: "Factuurgegevens", icon: Receipt },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default async function BeheerBedrijvenPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const activeTab: TabKey = TABS.some((t) => t.key === tab) ? (tab as TabKey) : "overzicht";

  return (
    <div>
      <PageHeader
        title="Bedrijven beheren"
        description={
          activeTab === "factuurgegevens"
            ? "Btw-nummers en factuuradressen in één overzicht, voor de boekhouder."
            : "Bedrijfsprofiel snel aanpassen, direct vanuit dit overzicht."
        }
      />

      <div className="mb-4 flex gap-1.5 overflow-x-auto">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "overzicht" ? "/beheer/bedrijven" : `/beheer/bedrijven?tab=${t.key}`}
            className={clsx(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium",
              activeTab === t.key ? "bg-voc-red text-white" : "bg-black/[.06] text-muted dark:bg-white/[.08]"
            )}
          >
            <t.icon size={14} />
            {t.label}
          </Link>
        ))}
      </div>

      {activeTab === "overzicht" && <BeheerBedrijvenContent />}
      {activeTab === "factuurgegevens" && <BeheerFactuurgegevensContent />}
    </div>
  );
}
