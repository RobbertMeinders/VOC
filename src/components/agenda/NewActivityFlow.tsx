"use client";

import { useState } from "react";
import { CalendarDays, Users } from "lucide-react";
import { ActivityForm } from "@/components/agenda/ActivityForm";
import { createActivityAction } from "@/app/(app)/agenda/actions";

// Alleen bestuur/beheer heeft hier daadwerkelijk iets te kiezen — een
// normaal lid krijgt sowieso altijd 'lid'/pending, ongeacht wat er
// verstuurd wordt (normalize_activity_submission-trigger, 0024), dus voor
// hen slaan we deze stap over en gaat het meteen naar het formulier.
export function NewActivityFlow({ board }: { board: boolean }) {
  const [source, setSource] = useState<"voc" | "lid" | null>(board ? null : "lid");

  if (source === null) {
    return (
      <div>
        <h1 className="mb-1 text-xl font-semibold text-foreground">Nieuwe activiteit</h1>
        <p className="mb-4 text-sm text-muted">Is dit een officiële VOC-activiteit of een ingebrachte activiteit?</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => setSource("voc")}
            className="flex flex-1 items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-left shadow-sm hover:border-voc-red"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-voc-red-light text-voc-red">
              <CalendarDays size={20} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">VOC-activiteit</span>
              <span className="block text-xs text-muted">Direct gepubliceerd, geen goedkeuring nodig.</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSource("lid")}
            className="flex flex-1 items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-left shadow-sm hover:border-voc-red"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/[.06] text-muted dark:bg-white/[.08]">
              <Users size={20} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">Ingebracht</span>
              <span className="block text-xs text-muted">Volgt de gewone goedkeuringslogica, net als bij een lid.</span>
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-foreground">
        {board ? "Nieuwe activiteit" : "Agenda activiteit toevoegen"}
      </h1>
      {!board && (
        <p className="mb-4 text-sm text-muted">
          Je activiteit komt pas in de agenda te staan zodra bestuur of beheer &apos;m heeft goedgekeurd.
        </p>
      )}
      {board && (
        <button type="button" onClick={() => setSource(null)} className="mb-4 text-xs text-muted hover:underline">
          &larr; Andere keuze
        </button>
      )}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <ActivityForm
          action={createActivityAction}
          submitLabel={source === "voc" ? "Activiteit aanmaken" : "Indienen ter goedkeuring"}
          canUploadImage
          initialSource={source}
        />
      </div>
    </div>
  );
}
