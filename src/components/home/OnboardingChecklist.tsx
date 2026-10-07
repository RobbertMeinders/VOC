"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { clsx } from "clsx";
import { dismissOnboardingAction } from "@/app/(app)/profiel/actions";

export type OnboardingStep = {
  key: string;
  label: string;
  done: boolean;
  href: string;
};

// UX-review U1: een nieuw lid landde direct op een lege Home-pagina zonder
// enige aanwijzing wat nu — deze checklist blijft staan tot alle stappen
// klaar zijn, of tot iemand 'm zelf wegklikt (dismissOnboardingAction).
export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const [isPending, startTransition] = useTransition();
  const doneCount = steps.filter((s) => s.done).length;

  function handleDismiss() {
    startTransition(async () => {
      await dismissOnboardingAction();
    });
  }

  return (
    <section className="animate-rise-in relative rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <button
        type="button"
        onClick={handleDismiss}
        disabled={isPending}
        aria-label="Welkomstblok wegklikken"
        className="absolute right-3 top-3 rounded-full p-1 text-muted hover:bg-black/[.04] hover:text-foreground disabled:opacity-50 dark:hover:bg-white/[.08]"
      >
        <X size={16} />
      </button>

      <h2 className="pr-6 text-sm font-semibold text-foreground">Welkom bij VOC — maak je profiel compleet</h2>

      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-black/[.06] dark:bg-white/[.08]">
        <div
          className="h-full rounded-full bg-voc-red transition-all duration-500"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted">
        {doneCount} van {steps.length} klaar
      </p>

      <ul className="mt-3 flex flex-col gap-1">
        {steps.map((step) => (
          <li key={step.key}>
            <Link
              href={step.href}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                step.done ? "text-muted" : "text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
              )}
            >
              <span
                className={clsx(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  step.done
                    ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                    : "border border-border"
                )}
              >
                {step.done && <Check size={12} />}
              </span>
              <span className={step.done ? "line-through" : ""}>{step.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
