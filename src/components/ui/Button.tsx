import { type ButtonHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variantClasses: Record<Variant, string> = {
  primary: "bg-voc-red text-white hover:bg-voc-red-dark disabled:bg-voc-red/50",
  secondary:
    "bg-surface text-foreground border border-border hover:bg-black/[.03] dark:hover:bg-white/[.06]",
  ghost: "text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.08]",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50",
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
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
});
