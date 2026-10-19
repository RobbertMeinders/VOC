import { type TextareaHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

// Zelfde opbouw als Input.tsx, nu voor <textarea> — de vele handgeschreven
// textarea-klassen door de app (OrgProfileForm, ContactMemberButton, enz.)
// verschilden net genoeg om niet 1-op-1 gelijk te ogen. Focusring is petrol
// (redesign-besluit 6); invalid blijft rood, net als Input/Select.
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={clsx(
          "w-full rounded-lg border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted",
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
