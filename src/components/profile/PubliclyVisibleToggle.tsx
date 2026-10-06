"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/Switch";
import { updatePubliclyVisibleAction } from "@/app/(app)/profiel/actions";

// Zelfde patroon als AttendedActivitiesToggle — per-persoon opt-in voor
// naam+functie op de openbare bedrijvengids-embed (zie
// 0050_public_company_directory.sql).
export function PubliclyVisibleToggle({ initialVisible }: { initialVisible: boolean }) {
  const [visible, setVisible] = useState(initialVisible);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !visible;
    setVisible(next);
    setError(null);
    startTransition(async () => {
      const result = await updatePubliclyVisibleAction(next);
      if (result.error) {
        setVisible(!next);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Switch checked={visible} onChange={toggle} disabled={isPending} label="Naam en functie tonen op bedrijvengids" />
      {error && <p className="text-right text-xs text-voc-red-text">{error}</p>}
    </div>
  );
}
