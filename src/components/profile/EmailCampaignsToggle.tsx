"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/Switch";
import { updateEmailCampaignsAction } from "@/app/(app)/profiel/actions";

// Zelfde patroon als NotificationCategoryToggle/PubliclyVisibleToggle —
// los van die matrix omdat campagnes geen van de 12 getriggerde
// notificatietypes zijn en geen push-variant hebben (zie 0070_newsletter_
// campaign_opt_out.sql).
export function EmailCampaignsToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    setError(null);
    startTransition(async () => {
      const result = await updateEmailCampaignsAction(next);
      if (result.error) {
        setEnabled(!next);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Switch checked={enabled} onChange={toggle} disabled={isPending} label="Campagnes van VOC" />
      {error && <p className="text-right text-xs text-voc-red-text">{error}</p>}
    </div>
  );
}
