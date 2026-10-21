"use client";

import { startTransition, useOptimistic, type ReactNode } from "react";
import { Chip } from "@/components/ui/Chip";
import { useTabNav } from "@/lib/ui/TabNavContext";

// Gedeelde vervanger voor een rij <Chip href=...>-tabs die alleen een
// zoekparameter op dezelfde pagina wijzigen (bv. ?tab=lijsten) — zie
// TabNavContext voor de volledige toelichting waarom een kale <Chip href>
// hier een klik liet aanvoelen alsof er niets gebeurde. Moet binnen een
// TabNavProvider gebruikt worden, en de content die erdoor wisselt binnen
// een TabContentArea.
export function QueryTabs<Key extends string>({
  tabs,
  active,
}: {
  tabs: { key: Key; label: ReactNode; href: string }[];
  active: Key;
}) {
  const { navigate } = useTabNav();
  const [optimisticActive, setOptimisticActive] = useOptimistic(active);

  function selectTab(tab: { key: Key; href: string }) {
    startTransition(() => {
      setOptimisticActive(tab.key);
      navigate(tab.href);
    });
  }

  return (
    <>
      {tabs.map((tab) => (
        <Chip key={tab.key} onClick={() => selectTab(tab)} active={optimisticActive === tab.key}>
          {tab.label}
        </Chip>
      ))}
    </>
  );
}
