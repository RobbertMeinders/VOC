import type { InputHTMLAttributes } from "react";
import { clsx } from "clsx";

type FileSelectButtonProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

// Vervangt de native bestandskiezer-knop ("Choose File") door een eigen
// Nederlandstalige knop — die tekst komt van de systeemtaal van de
// browser, niet van de pagina, en is niet via CSS te vertalen.
export function FileSelectButton({ label = "Bestand kiezen", className, id, ...props }: FileSelectButtonProps) {
  return (
    <label
      htmlFor={id}
      className={clsx(
        "inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-sm font-medium text-foreground hover:bg-black/[.03] dark:hover:bg-white/[.06]",
        className
      )}
    >
      {label}
      <input id={id} type="file" className="sr-only" {...props} />
    </label>
  );
}
