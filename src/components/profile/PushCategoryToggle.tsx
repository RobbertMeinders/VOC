"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/Switch";
import {
  updatePushActivitiesAction,
  updatePushFeedAction,
  updatePushNewMembersAction,
} from "@/app/(app)/profiel/actions";

const ACTIONS = {
  activities: updatePushActivitiesAction,
  feed: updatePushFeedAction,
  new_members: updatePushNewMembersAction,
} as const;

const LABELS = {
  activities: "Pushmeldingen voor activiteiten",
  feed: "Pushmeldingen voor reacties en vermeldingen",
  new_members: "Pushmeldingen voor nieuwe leden",
} as const;

export function PushCategoryToggle({
  category,
  initialEnabled,
}: {
  category: keyof typeof ACTIONS;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    setError(null);
    startTransition(async () => {
      const result = await ACTIONS[category](next);
      if (result.error) {
        setEnabled(!next);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Switch checked={enabled} onChange={toggle} disabled={isPending} label={LABELS[category]} />
      {error && <p className="text-right text-xs text-voc-red">{error}</p>}
    </div>
  );
}
