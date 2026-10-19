"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/Switch";
import { updateAllNotificationChannelsAction } from "@/app/(app)/beheer/communicatie/notificatieregels-actions";

// Boven de tabel in NotificatieregelsTab: één schakelaar voor push + e-mail
// op élke regel tegelijk, voor "ik wil nu even helemaal niets laten
// versturen". router.refresh() ná een gelukte wijziging, zodat de rijen
// eronder (die zelf hun laatst-opgeslagen stand onthouden, zie
// NotificationRuleRow) de nieuwe stand ook echt tonen — de key per rij in
// de aanroepende server component is aan updated_at gekoppeld, juist om dat
// op te vangen.
export function AllNotificationChannelsSwitch({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleChange() {
    const next = !enabled;
    setEnabled(next);
    setError(null);
    startTransition(async () => {
      const result = await updateAllNotificationChannelsAction(next);
      if (result.error) {
        setError(result.error);
        setEnabled(!next);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">Alles</p>
        {error && <p className="mt-1 text-xs text-voc-red-text">{error}</p>}
      </div>
      <Switch checked={enabled} onChange={handleChange} disabled={pending} label="Push en e-mail voor alle regels" />
    </div>
  );
}
