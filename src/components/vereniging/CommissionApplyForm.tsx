"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { applyToCommissionAction } from "@/app/(app)/vereniging/commissies/actions";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/lib/ui/ToastContext";

// UX-feedback: één gedeelde aanmeld-CTA i.p.v. een losse aanmeldknop per
// commissie-kaart — minder nadruk op "kies een vakje", meer op "wil je
// bijdragen? meld je aan, waarvoor dan ook". `options` bevat élke commissie
// (zie commissies/page.tsx) — een commissie waar de kijker al lid van is of
// een lopende aanvraag voor heeft, staat er nog gewoon in maar dan als
// uitgegrijsde, niet-kiesbare optie met een reden erbij. Eerder verdween die
// optie stilletjes uit de lijst, wat op "de commissie ontbreekt" leek i.p.v.
// "je bent 'm al lid" (review-feedback).
export function CommissionApplyForm({ options }: { options: { id: string; name: string; disabledReason?: string }[] }) {
  const [commissionId, setCommissionId] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  if (options.every((o) => o.disabledReason)) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!commissionId) return;
    // Zelfde reden als de vorige per-commissie knop: een aanvraag die het
    // bestuur beoordeelt en die je zelf niet meer kunt intrekken, verdient
    // een expliciete bevestiging.
    const commissionName = options.find((o) => o.id === commissionId)?.name ?? "deze commissie";
    if (!window.confirm(`Aanmelden voor ${commissionName}? Je aanvraag wordt ter beoordeling voorgelegd aan het bestuur.`)) {
      return;
    }
    startTransition(async () => {
      const result = await applyToCommissionAction(commissionId, message);
      if (result.error) {
        toast(result.error);
        return;
      }
      toast("Aanmelding verstuurd.");
      setCommissionId("");
      setMessage("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-surface p-4 shadow-sm">
      <p className="text-sm font-semibold text-foreground">Wil je bijdragen aan een van de commissies?</p>
      <p className="mt-1 text-sm text-muted">Meld je hieronder aan — je aanvraag wordt ter beoordeling voorgelegd aan het bestuur.</p>

      <div className="mt-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="commission-apply-select" className="text-xs font-medium text-foreground">
            Voor welke commissie wil je je aanmelden?
          </label>
          <Select
            id="commission-apply-select"
            value={commissionId}
            onChange={(e) => setCommissionId(e.target.value)}
            required
            surface="background"
            className="h-10 pl-3"
          >
            <option value="" disabled>
              Kies een commissie…
            </option>
            {options.map((option) => (
              <option key={option.id} value={option.id} disabled={Boolean(option.disabledReason)}>
                {option.name}
                {option.disabledReason ? ` (${option.disabledReason})` : ""}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="commission-apply-message" className="text-xs font-medium text-foreground">
            Toelichting (optioneel)
          </label>
          <textarea
            id="commission-apply-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Vertel kort waarom je je aanmeldt…"
            className="rounded-lg border border-input-border bg-background px-3 py-2 text-sm text-foreground focus:border-petrol focus:outline-none focus:ring-2 focus:ring-petrol/20"
          />
        </div>

        <Button type="submit" size="sm" disabled={isPending || !commissionId} className="self-start">
          {isPending ? "Versturen…" : "Aanmelden"}
        </Button>
      </div>
    </form>
  );
}
