"use client";

import { useState, useTransition } from "react";
import { Select } from "@/components/ui/Select";
import { updateNotificationChannelAction } from "@/app/(app)/profiel/actions";

type Category = "activities" | "feed";
type Choice = "push" | "email" | "both" | "none";

function toChoice(push: boolean, email: boolean): Choice {
  if (push && email) return "both";
  if (push) return "push";
  if (email) return "email";
  return "none";
}

// Communicatieplan: één keuze i.p.v. losse push/e-mail-schakelaars, zodat
// "beide" een bewuste keuze is i.p.v. de ongemerkte standaard die het
// voorheen was.
export function NotificationChannelChoice({
  category,
  initialPush,
  initialEmail,
}: {
  category: Category;
  initialPush: boolean;
  initialEmail: boolean;
}) {
  const [choice, setChoice] = useState<Choice>(toChoice(initialPush, initialEmail));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: Choice) {
    const previous = choice;
    setChoice(next);
    setError(null);
    startTransition(async () => {
      const result = await updateNotificationChannelAction(category, next);
      if (result.error) {
        setChoice(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Select
        variant="bare"
        value={choice}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value as Choice)}
        className="h-9 pl-2.5 font-medium"
      >
        <option value="push">Pushmelding</option>
        <option value="email">E-mail</option>
        <option value="both">Beide</option>
        <option value="none">Geen</option>
      </Select>
      {error && <p className="text-right text-xs text-voc-red-text">{error}</p>}
    </div>
  );
}
