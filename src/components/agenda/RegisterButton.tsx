"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { registerForActivityAction, unregisterFromActivityAction } from "@/app/(app)/agenda/actions";

export function RegisterButton({
  activityId,
  initialRegistered,
  isFull,
  deadlinePassed,
}: {
  activityId: string;
  initialRegistered: boolean;
  isFull: boolean;
  deadlinePassed: boolean;
}) {
  const [registered, setRegistered] = useState(initialRegistered);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = registered
        ? await unregisterFromActivityAction(activityId)
        : await registerForActivityAction(activityId);

      if (result?.error) {
        setError(result.error);
      } else {
        setRegistered((r) => !r);
      }
    });
  }

  if (!registered && (isFull || deadlinePassed)) {
    return (
      <Button disabled variant="secondary">
        {deadlinePassed ? "Aanmelden is gesloten" : "Activiteit is vol"}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleClick} disabled={pending} variant={registered ? "secondary" : "primary"}>
        {pending ? "Bezig…" : registered ? "Afmelden" : "Aanmelden"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-voc-red">
          {error}
        </p>
      )}
    </div>
  );
}
