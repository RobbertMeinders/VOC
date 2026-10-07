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
// Geen flex-wrap: dat brak de 4 opties op mobiel lelijk over 2-3 ongelijke
// regels (de rij in instellingen/page.tsx staat daarom op mobiel onder het
// label i.p.v. ernaast, zodat deze pil altijd de volle breedte heeft en in
// één keurige rij past). w-full hier gaat mee in die volle breedte; vanaf
// sm: (waar de rij weer naast het label staat) krimpt hij terug naar zijn
// eigen inhoud.
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
    <div className="flex w-full flex-col items-end gap-1 sm:w-auto">
      <div className="flex w-full justify-between rounded-lg border border-border bg-background p-1 sm:w-auto sm:justify-end sm:gap-1">
        {OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            disabled={isPending}
            onClick={() => handleChange(value)}
            className={clsx(
              "flex-1 rounded-md px-2.5 py-1 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none",
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
