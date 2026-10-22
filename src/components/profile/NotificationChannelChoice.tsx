"use client";

import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { Chip } from "@/components/ui/Chip";
import { updateNotificationChannelAction, type ChannelNotificationType } from "@/app/(app)/profiel/actions";

type Choice = "push" | "email" | "both" | "none";

function toChoice(push: boolean, email: boolean): Choice {
  if (push && email) return "both";
  if (push) return "push";
  if (email) return "email";
  return "none";
}

const OPTIONS: { value: Choice; label: string }[] = [
  { value: "push", label: "App" },
  { value: "email", label: "E-mail" },
  { value: "both", label: "Beide" },
  { value: "none", label: "Uit" },
];

// Communicatieplan: één keuze i.p.v. losse push/e-mail-schakelaars, als
// rij Chips i.p.v. een <select> (die stak qua gewicht en, in donker thema,
// qua contrast af tegen de schakelaars verderop op dezelfde pagina).
// Afwerkronde blok 3: dit hoort bij "filteren of kiezen" (net als Alles/VOC
// in de agenda), dus de gedeelde Chip (inkt op actief) i.p.v. een eigen
// segment-pil-track met surface+schaduw — dat laatste is voor "wisselen van
// weergave" (Leden/Bedrijven, Lijst/Kaart, Thema), een andere categorie.
// Geen flex-wrap: dat brak de 4 opties op mobiel lelijk over 2-3 ongelijke
// regels (de rij in instellingen/page.tsx staat daarom op mobiel onder het
// label i.p.v. ernaast, zodat deze pil altijd de volle breedte heeft en in
// één keurige rij past). w-full hier gaat mee in die volle breedte; vanaf
// sm: (waar de rij weer naast het label staat) krimpt hij terug naar zijn
// eigen inhoud.
//
// Meldingensysteem-overhaul Fase 3: category (twee brede groepen) werd type
// (vier losse notificatietypes) — zelfde component, nu per type aangeroepen.
export function NotificationChannelChoice({
  type,
  initialPush,
  initialEmail,
}: {
  type: ChannelNotificationType;
  initialPush: boolean;
  initialEmail: boolean;
}) {
  const [choice, setChoice] = useState<Choice>(toChoice(initialPush, initialEmail));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: Choice) {
    if (next === choice || isPending) return;
    const previous = choice;
    setChoice(next);
    setError(null);
    startTransition(async () => {
      const result = await updateNotificationChannelAction(type, next);
      if (result.error) {
        setChoice(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex w-full flex-col items-end gap-1 sm:w-auto">
      <div className="flex w-full justify-between gap-1.5 sm:w-auto sm:justify-end">
        {OPTIONS.map(({ value, label }) => (
          <Chip
            key={value}
            active={choice === value}
            onClick={() => handleChange(value)}
            className={clsx("flex-1 justify-center sm:flex-none", isPending && "cursor-not-allowed opacity-60")}
          >
            {label}
          </Chip>
        ))}
      </div>
      {error && <p className="text-right text-xs text-danger-text">{error}</p>}
    </div>
  );
}
