import type { HTMLAttributes } from "react";
import { clsx } from "clsx";

// Redesign fase 2 + stijlronde "zelfde indeling, nieuwe stijl": de
// kaartopbouw die al overal met de hand werd getypt ("rounded-2xl
// bg-surface shadow-sm") als één component — radius 2xl is de vaste
// kaartconventie (fase 5), de schaduw komt via Tailwinds eigen (in
// globals.css herdefinieerde) shadow-sm. Geen rand meer (stijlronde):
// scheiding van de achtergrond gaat voortaan alleen via de schaduw, niet
// via rand + schaduw tegelijk. `padded` zet de gebruikelijke binnenmarge;
// zonder wordt dat aan de aanroeper overgelaten (bv. een kaart met een
// eigen kop + inhoud met andere marges per sectie). `as` laat een paar
// call sites (een nieuwsbericht, een feed-post) het semantische
// `<article>` behouden i.p.v. altijd een kale `<div>`.
export function Card({
  as: Tag = "div",
  className,
  padded = true,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: "div" | "article"; padded?: boolean }) {
  return (
    <Tag
      className={clsx("rounded-2xl bg-surface shadow-sm", padded && "p-6", className)}
      {...props}
    />
  );
}
