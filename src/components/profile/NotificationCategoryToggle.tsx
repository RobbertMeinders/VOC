"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/Switch";
import {
  updatePushActivitiesAction,
  updatePushFeedAction,
  updatePushNewMembersAction,
  updateEmailActivitiesAction,
  updateEmailFeedAction,
  updateEmailNewMembersAction,
} from "@/app/(app)/profiel/actions";

type Category = "activities" | "feed" | "new_members";

const ACTIONS = {
  push: {
    activities: updatePushActivitiesAction,
    feed: updatePushFeedAction,
    new_members: updatePushNewMembersAction,
  },
  email: {
    activities: updateEmailActivitiesAction,
    feed: updateEmailFeedAction,
    new_members: updateEmailNewMembersAction,
  },
} as const;

const LABELS: Record<Category, string> = {
  activities: "Meldingen voor activiteiten",
  feed: "Meldingen voor reacties en vermeldingen",
  new_members: "Meldingen voor nieuwe leden",
};

export function NotificationCategoryToggle({
  channel,
  category,
  initialEnabled,
}: {
  channel: "push" | "email";
  category: Category;
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
      const result = await ACTIONS[channel][category](next);
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
