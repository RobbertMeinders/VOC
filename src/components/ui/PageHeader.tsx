import type { ReactNode } from "react";
import { BackLink } from "@/components/ui/BackLink";

// UX-review V3: elke pagina bouwde zijn eigen kop (titel + ondertitel +
// eventueel een actieknop) net iets anders op, en op mobiel viel de
// hoofdactie van Beheer -> Activiteiten (" + Nieuwe activiteit") buiten
// beeld doordat die knop gewoon naast de titel bleef staan op een 390px
// scherm. Eén component: titel, optioneel één regel uitleg, optioneel een
// terug-link (alleen zinvol op detail-/formulierpagina's, zie BackLink) en
// optioneel één hoofdactie rechts — die laatste krijgt op mobiel de volle
// breedte onder de titel, of — als `floatingAction` is meegegeven in
// plaats van `action` zichtbaar te houden — een zwevende knop rechtsonder,
// boven de bottom nav.
export function PageHeader({
  title,
  description,
  back,
  action,
  floatingAction,
  eyebrow,
}: {
  title: string;
  description?: ReactNode;
  back?: { href: string; label: string };
  action?: ReactNode;
  floatingAction?: ReactNode;
  // Identiteit Fase 2: optioneel klein rood uppercase-labeltje boven de
  // titel — alleen gebruiken waar het inhoudelijk past (bv. een sectie- of
  // categorienaam), niet verplicht op elke aanroepplek.
  eyebrow?: string;
}) {
  return (
    <div className="mb-6">
      {back && <BackLink href={back.href} label={back.label} />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-voc-red-text">{eyebrow}</p>
          )}
          {/* Redesign fase 1/3: kopletter, paginatitel-maat uit het ontwerp
              (28px mobiel -> 32px desktop, gewicht 800, letter-spacing
              -0.03em) i.p.v. de vorige text-xl/semibold. */}
          <h1 className="font-display text-[1.75rem] font-extrabold tracking-[-0.03em] text-foreground sm:text-[2rem]">
            {title}
          </h1>
          {/* Identiteit Fase 2: kort rood accent-streepje onder elke
              paginatitel — rood als terugkerend anker, ook buiten acties. */}
          <span aria-hidden className="mt-1.5 block h-[3px] w-6 rounded-full bg-voc-red" />
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {action && (
          <div className={floatingAction ? "hidden shrink-0 sm:block" : "w-full shrink-0 sm:w-auto"}>{action}</div>
        )}
      </div>
      {floatingAction && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] right-4 z-30 sm:hidden">
          {floatingAction}
        </div>
      )}
      <div aria-hidden className="gradient-rule mt-4 rounded-full" />
    </div>
  );
}
