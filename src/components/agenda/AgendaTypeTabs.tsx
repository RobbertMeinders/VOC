"use client";

import { startTransition, useOptimistic } from "react";
import { Chip } from "@/components/ui/Chip";
import { useTabNav } from "@/lib/ui/TabNavContext";

const TYPE_TABS = [
  { value: undefined, label: "Alles" },
  { value: "activiteit", label: "VOC" },
  { value: "ingebracht", label: "Extern" },
  { value: "mijn-aanmeldingen", label: "Aangemeld" },
] as const;

// Was een kale <Chip href>-rij (volledige Next-navigatie, dus de zwaarste
// tabwissel van de app — drie queries + signed urls opnieuw per klik, zie
// AgendaPage) — nu via TabNavContext/TabContentArea, zelfde patroon als de
// statistiekenpagina.
export function AgendaTypeTabs({ active }: { active?: string }) {
  const { navigate } = useTabNav();
  const [optimisticActive, setOptimisticActive] = useOptimistic(active);

  function selectTab(value?: string) {
    startTransition(() => {
      setOptimisticActive(value);
      navigate(value ? `/agenda?type=${value}` : "/agenda");
    });
  }

  return (
    <div className="mb-4 flex gap-1.5 overflow-x-auto">
      {TYPE_TABS.map((tab) => (
        <Chip key={tab.label} onClick={() => selectTab(tab.value)} active={(optimisticActive ?? undefined) === tab.value}>
          {tab.label}
        </Chip>
      ))}
    </div>
  );
}
