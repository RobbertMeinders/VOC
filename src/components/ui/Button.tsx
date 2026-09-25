import { type ButtonHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

// hover:-translate-y-px alleen op de "actie"-varianten (niet ghost, vaak een
// kleine icoon-/menuknop waar optillen minder op zijn plek is) — voelt op
// desktop (waar hover bestaat) net iets tactieler dan alleen een kleurvlak.
const variantClasses: Record<Variant, string> = {
  primary: "bg-voc-red text-white hover:-translate-y-px hover:bg-voc-red-dark disabled:bg-voc-red/50 disabled:hover:translate-y-0",
  secondary:
    "bg-surface text-foreground border border-border hover:-translate-y-px hover:bg-black/[.03] dark:hover:bg-white/[.06]",
  ghost: "text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.08]",
  danger: "bg-red-600 text-white hover:-translate-y-px hover:bg-red-700 disabled:bg-red-600/50 disabled:hover:translate-y-0",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function Button({ className, variant = "primary", size = "md", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
});
