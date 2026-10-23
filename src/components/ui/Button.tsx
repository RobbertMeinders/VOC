import { type ButtonHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

// hover:-translate-y-px alleen op de "actie"-varianten (niet ghost, vaak een
// kleine icoon-/menuknop waar optillen minder op zijn plek is) — voelt op
// desktop (waar hover bestaat) net iets tactieler dan alleen een kleurvlak.
// dark:bg-[#e01e26]/dark:hover:bg-[#c81920] op primary/danger: --voc-red in
// dark mode (globals.css) is een helderder rood dan in licht thema, bedoeld
// om tegen de donkere achtergrond op te vallen — maar wit op die kleur komt
// uit op ~4,0:1 contrast, onder de WCAG-ondergrens van 4,5:1 voor gewone
// knoptekst. Een losse, donkerdere override hier i.p.v. het gedeelde
// --voc-red-token aan te passen, want dat token wordt ook gebruikt waar wit-
// op-rood niet aan de orde is (logo, actief-navigatie-item, tellers) en die
// zouden dan onnodig mee veranderen. ~4,8:1 bij #e01e26.
const variantClasses: Record<Variant, string> = {
  primary:
    "bg-voc-red text-white hover:-translate-y-px hover:bg-voc-red-dark disabled:bg-voc-red/50 disabled:hover:translate-y-0 dark:bg-[#e01e26] dark:hover:bg-[#c81920]",
  secondary:
    "bg-surface text-foreground border border-border hover:-translate-y-px hover:bg-black/[.03] dark:hover:bg-white/[.06]",
  ghost: "text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.08]",
  danger:
    "bg-danger text-white hover:-translate-y-px hover:bg-voc-red-dark disabled:bg-danger/50 disabled:hover:translate-y-0 dark:bg-[#e01e26] dark:hover:bg-[#c81920]",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

// Geëxporteerd zodat niet-<button>-elementen (bv. PopupLoginLink's <a>, dat
// vanwege het pop-up-tabblad-mechanisme geen <button> kan zijn) exact
// dezelfde knopstijl kunnen dragen i.p.v. die los te dupliceren — embed-
// vormgeving-opdracht: één consistent knop-/statussysteem, ook buiten de
// portaalschermen die <Button> zelf al rechtstreeks gebruiken.
export function buttonClassName(variant: Variant = "primary", size: Size = "md", className?: string): string {
  return clsx(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100",
    variantClasses[variant],
    sizeClasses[size],
    className
  );
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function Button({ className, variant = "primary", size = "md", ...props }, ref) {
  return <button ref={ref} className={buttonClassName(variant, size, className)} {...props} />;
});
