"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/Switch";
import { updateCompanyShowAddressAction } from "@/app/(app)/bedrijven/[id]/actions";

// Standalone tegenhanger van het schuifje in CompanyForm — zelfde kolom,
// maar los op de instellingenpagina van het lid dat bij dit bedrijf hoort.
export function ShowAddressToggle({ companyId, initialVisible }: { companyId: string; initialVisible: boolean }) {
  const [visible, setVisible] = useState(initialVisible);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !visible;
    setVisible(next);
    setError(null);
    startTransition(async () => {
      const result = await updateCompanyShowAddressAction(companyId, next);
      if (result.error) {
        setVisible(!next);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Switch checked={visible} onChange={toggle} disabled={isPending} label="Bezoekersadres tonen" />
      {error && <p className="text-right text-xs text-voc-red">{error}</p>}
    </div>
  );
}
