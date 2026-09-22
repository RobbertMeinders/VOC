"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/Switch";
import { updateAttendedActivitiesVisibilityAction } from "@/app/(app)/profiel/actions";

export function AttendedActivitiesToggle({ initialVisible }: { initialVisible: boolean }) {
  const [visible, setVisible] = useState(initialVisible);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !visible;
    setVisible(next);
    setError(null);
    startTransition(async () => {
      const result = await updateAttendedActivitiesVisibilityAction(next);
      if (result.error) {
        setVisible(!next);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Switch checked={visible} onChange={toggle} disabled={isPending} label="Bijgewoonde evenementen tonen" />
      {/* Zichtbare foutmelding i.p.v. de schakelaar stil terug te laten
          klappen — dat laatste oogt alsof de knop het niet doet, zonder
          enige aanwijzing waarom. */}
      {error && <p className="text-right text-xs text-voc-red">{error}</p>}
    </div>
  );
}
