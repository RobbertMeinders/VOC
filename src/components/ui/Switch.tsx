"use client";

import { clsx } from "clsx";

// Eén iOS-stijl schakelaar, gedeeld door elke aan/uit-instelling
// (pushmeldingen, bijgewoonde evenementen tonen, ...) i.p.v. dat elke
// instelling zijn eigen knop-stijl uitvindt.
export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={clsx(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60",
        checked ? "bg-voc-red" : "bg-black/[.12] dark:bg-white/[.16]"
      )}
    >
      <span
        className={clsx(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
