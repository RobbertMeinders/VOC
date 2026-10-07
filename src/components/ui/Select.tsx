import { type SelectHTMLAttributes, forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";

// UX-review V12: een kale <select> leunt op het besturingssysteem van de
// bezoeker (ander lettertype, andere hoogte, andere pijl per browser/OS) en
// voelde daardoor los van de rest van het formulier. Een volledig zelf
// getekende optielijst zou op mobiel juist de native, vertrouwde
// wheel-picker/bottom-sheet van iOS/Android kosten — dus i.p.v. dat te
// vervangen, blijft de native <select> (toetsenbord- en
// schermlezer-gedrag blijven daarmee ook gratis correct) en wordt alleen de
// gesloten weergave herstijld: appearance-none strip het eigen uiterlijk,
// en de pijl ernaast is nu altijd hetzelfde chevron-icoon i.p.v. het
// browsereigen driehoekje.
// `className` draagt alleen layout aan (hoogte, breedte, linker-padding,
// mt/flex-1 e.d.) — nooit iets dat hier al vastligt (rand, achtergrond,
// focusring, rechter-padding), want zonder een merge-library zoals
// tailwind-merge zou een conflicterende utility in `className` niet
// betrouwbaar "winnen" van de vaste klassen hieronder. `pr-9` ligt daarom
// altijd vast (ruimte voor het chevron-icoon); elke aanroepplek zet zelf
// alleen `pl-*`/`h-*`/`w-*` in plaats van het kortere `px-*`. `surface`
// kiest tussen de twee vaste achtergronden — "background" voor een select
// die (samen met een naastliggend <textarea>) verdiept moet liggen in een
// al bg-surface-gekleurd paneel (bv. een overlay-kaart).
// `variant="bare"` laat rand en achtergrond helemaal weg (alleen tekst +
// chevron, met een hover-vlak) — voor een instellingenrij naast een
// Switch, waar een volle invoerveld-doos te zwaar oogt naast zo'n lichte
// schakelaar. `surface` wordt dan genegeerd.
export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & {
    invalid?: boolean;
    surface?: "surface" | "background";
    variant?: "bordered" | "bare";
  }
>(function Select({ className, invalid, surface = "surface", variant = "bordered", children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={clsx(
          "appearance-none rounded-lg pr-9 text-sm text-foreground",
          variant === "bare"
            ? "hover:bg-black/[.04] dark:hover:bg-white/[.06] focus:outline-none focus:ring-2 focus:ring-voc-red/20"
            : clsx(
                "border",
                surface === "surface" ? "bg-surface" : "bg-background",
                invalid
                  ? "border-voc-red focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
                  : "border-input-border focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
              ),
          "disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  );
});
