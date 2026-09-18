import { type InputHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={clsx(
          "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted",
          "focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
        {...props}
      />
    );
  }
);
