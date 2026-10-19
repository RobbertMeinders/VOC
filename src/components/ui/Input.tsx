import { type InputHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

// UX-review U5: invalid geeft een rode rand voor foutmeldingen die onder
// het veld staan (zie FieldError) i.p.v. de browser's eigen validatieballon.
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...props }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={clsx(
          "h-10 w-full rounded-lg border bg-surface px-3 text-sm text-foreground placeholder:text-muted",
          invalid
            ? "border-danger focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/20"
            : "border-input-border focus:border-petrol focus:outline-none focus:ring-2 focus:ring-petrol/20",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
        {...props}
      />
    );
  }
);
