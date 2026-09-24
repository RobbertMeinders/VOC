"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/Switch";
import { updateShowEmailAction, updateShowPhoneAction } from "@/app/(app)/profiel/actions";

// Standalone tegenhanger van de show_email/show_phone-schuifjes in
// ProfileForm — zelfde twee kolommen, maar los op de instellingenpagina
// i.p.v. alleen via het volledige profielformulier. Eén component met een
// `field`-prop i.p.v. twee bijna-identieke bestanden.
export function ShowContactToggle({
  field,
  initialVisible,
}: {
  field: "email" | "phone";
  initialVisible: boolean;
}) {
  const [visible, setVisible] = useState(initialVisible);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const action = field === "email" ? updateShowEmailAction : updateShowPhoneAction;
  const label = field === "email" ? "E-mailadres tonen" : "Telefoonnummer tonen";

  function toggle() {
    const next = !visible;
    setVisible(next);
    setError(null);
    startTransition(async () => {
      const result = await action(next);
      if (result.error) {
        setVisible(!next);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Switch checked={visible} onChange={toggle} disabled={isPending} label={label} />
      {error && <p className="text-right text-xs text-voc-red">{error}</p>}
    </div>
  );
}
