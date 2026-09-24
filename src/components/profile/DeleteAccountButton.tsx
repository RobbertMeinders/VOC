"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteMyAccountAction } from "@/app/(app)/profiel/actions";

export function DeleteAccountButton() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(
      "Weet je zeker dat je je account wilt verwijderen?\n\n" +
        "Je wordt direct uitgelogd en het account is niet meer bruikbaar. Persoonsgegevens (naam, e-mail, " +
        "telefoon, foto, functie, bio) worden na 90 dagen automatisch gewist. Geplaatste berichten en reacties " +
        'blijven staan, wel voortaan onder "Verwijderd lid". Binnen die 90 dagen kan alleen het bestuur dit nog ' +
        "ongedaan maken."
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteMyAccountAction();
      // Bij succes redirect()'t de action zelf (naar /login) — hier komen
      // we dan niet meer aan toe; alleen een mislukte poging geeft iets terug.
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-full border border-voc-red px-3 py-1.5 text-sm font-medium text-voc-red hover:bg-voc-red-light disabled:opacity-60"
      >
        <Trash2 size={14} />
        {isPending ? "Bezig…" : "Account verwijderen"}
      </button>
      {error && <p className="text-right text-xs text-voc-red">{error}</p>}
    </div>
  );
}
