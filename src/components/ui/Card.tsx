import type { HTMLAttributes } from "react";
import { clsx } from "clsx";

// Redesign fase 2: de kaartopbouw die al overal met de hand werd
// getypt ("rounded-2xl border border-border bg-surface shadow-sm") als
// één component — radius 2xl is de vaste kaartconventie (fase 5), de
// schaduw komt via Tailwinds eigen (in globals.css herdefinieerde)
// shadow-sm. `padded` zet de gebruikelijke binnenmarge; zonder wordt dat
// aan de aanroeper overgelaten (bv. een kaart met een eigen kop + inhoud
// met andere marges per sectie).
export function Card({
  className,
  padded = true,
  ...props
}: HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  return (
    <div
      className={clsx("rounded-2xl border border-border bg-surface shadow-sm", padded && "p-6", className)}
      {...props}
    />
  );
}
