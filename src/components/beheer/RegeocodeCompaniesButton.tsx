"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { regeocodeMissingCompaniesAction, type RegeocodeState } from "@/app/(app)/beheer/bedrijven/actions";

// Kan een paar minuten duren (sequentieel geocoderen, max. 1 aanroep/seconde
// bij Nominatim) — vandaar een losse knop i.p.v. dit automatisch te laten
// lopen, met duidelijke voortgangstekst zodat een beheerder niet denkt dat de
// pagina is vastgelopen.
export function RegeocodeCompaniesButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<RegeocodeState | null>(null);
  const router = useRouter();

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Ontbrekende locaties op de kaart</p>
          <p className="text-xs text-muted">
            Zoekt bedrijven met een adres maar zonder coördinaten, en probeert die opnieuw te geocoderen.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isPending}
          className="shrink-0"
          onClick={() => {
            setResult(null);
            startTransition(async () => {
              const outcome = await regeocodeMissingCompaniesAction();
              setResult(outcome);
              if (!outcome.error) router.refresh();
            });
          }}
        >
          <MapPin size={13} />
          {isPending ? "Bezig…" : "Controleer en herstel"}
        </Button>
      </div>
      {result?.error && (
        <p role="alert" className="text-sm text-voc-red">
          {result.error}
        </p>
      )}
      {result && !result.error && (
        <p role="status" className="text-sm text-green-600">
          {result.total === 0
            ? "Alle bedrijven met een adres hebben al coördinaten."
            : `${result.fixed} van ${result.total} bedrijven zonder coördinaten zijn hersteld.`}
        </p>
      )}
    </div>
  );
}
