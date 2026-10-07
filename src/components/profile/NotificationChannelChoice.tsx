"use client";

import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { updateNotificationChannelAction } from "@/app/(app)/profiel/actions";

type Category = "activities" | "feed";
type Choice = "push" | "email" | "both" | "none";

function toChoice(push: boolean, email: boolean): Choice {
  if (push && email) return "both";
  if (push) return "push";
  if (email) return "email";
  return "none";
}

const OPTIONS: { value: Choice; label: string }[] = [
  { value: "push", label: "Push" },
  { value: "email", label: "Mail" },
  { value: "both", label: "Beide" },
  { value: "none", label: "Geen" },
];

// Communicatieplan: één keuze i.p.v. losse push/e-mail-schakelaars. Zelfde
// segment-pil-stijl als ThemeToggle (bg-background-pil met een rode actieve
// knop) i.p.v. een <select> — een dropdown stak qua gewicht en, in donker
// thema, qua contrast af tegen de schakelaars verderop op dezelfde pagina.
// flex-wrap vangt op dat 4 opties op een smal scherm niet naast een lange
// rijlabel ("Reacties en vermeldingen") passen — breekt dan netjes naar 2x2
// i.p.v. van de pagina af te lopen.
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
    if (next === choice) return;
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
      <div className="inline-flex flex-wrap justify-end gap-y-1 rounded-lg border border-border bg-background p-1">
        {OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            disabled={isPending}
            onClick={() => handleChange(value)}
            className={clsx(
              "rounded-md px-2.5 py-1 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              choice === value ? "bg-voc-red text-white" : "text-muted hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <p className="text-right text-xs text-voc-red-text">{error}</p>}
    </div>
  );
}
