import { type ButtonHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

type Variant = "outline" | "ghost";
type Size = "sm" | "md";

// Redesign fase 2 — "rood op dieet": een rode hover-rand/-tekst op een
// iconknop was tot nu toe het standaardpatroon door de hele app (~56
// plekken, met de hand getypt). Die hover-accent wordt neutraal; rood
// blijft voorbehouden aan logo/hoofdknop/actief item/teller/fout.
const variantClasses: Record<Variant, string> = {
  outline:
    "border border-border bg-surface text-foreground hover:border-foreground/30 hover:bg-black/[.03] dark:hover:bg-white/[.06]",
  ghost: "text-muted hover:bg-black/[.04] hover:text-foreground dark:hover:bg-white/[.08]",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
};

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function IconButton({ className, variant = "ghost", size = "md", type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
});
