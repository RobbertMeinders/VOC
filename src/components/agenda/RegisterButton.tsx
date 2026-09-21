"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { registerForActivityAction, unregisterFromActivityAction } from "@/app/(app)/agenda/actions";

export function RegisterButton({
  activityId,
  initialRegistered,
  initialWaitlisted,
  isFull,
  deadlinePassed,
}: {
  activityId: string;
  initialRegistered: boolean;
  initialWaitlisted: boolean;
  isFull: boolean;
  deadlinePassed: boolean;
}) {
  const [registered, setRegistered] = useState(initialRegistered);
  const [waitlisted, setWaitlisted] = useState(initialWaitlisted);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      if (registered) {
        const result = await unregisterFromActivityAction(activityId);
        if (result?.error) {
          setError(result.error);
        } else {
          setRegistered(false);
          setWaitlisted(false);
        }
        return;
      }

      const result = await registerForActivityAction(activityId);
      if (result?.error) {
        setError(result.error);
      } else {
        setRegistered(true);
        setWaitlisted(Boolean(result.waitlisted));
      }
    });
  }

  if (!registered && deadlinePassed) {
    return (
      <Button disabled variant="secondary">
        Aanmelden is gesloten
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleClick} disabled={pending} variant={registered ? "secondary" : "primary"}>
        {pending
          ? "Bezig…"
          : registered
            ? waitlisted
              ? "Wachtlijst verlaten"
              : "Afmelden"
            : isFull
              ? "Op de wachtlijst"
              : "Aanmelden"}
      </Button>
      {registered && waitlisted && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Je staat op de wachtlijst — je krijgt bericht zodra er een plek vrijkomt.
        </p>
      )}
      {!registered && isFull && (
        <p className="text-xs text-muted">Deze activiteit is vol, maar je kunt je op de wachtlijst zetten.</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-voc-red">
          {error}
        </p>
      )}
    </div>
  );
}
