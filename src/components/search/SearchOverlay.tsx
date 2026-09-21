"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { clsx } from "clsx";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useOverlay } from "@/lib/ui/OverlayContext";

// Zoeken als snelle overlay i.p.v. altijd eerst naar /zoeken te navigeren —
// zelfde open/sluit-gevoel als het account- en notificatiemenu. De
// resultaten zelf blijven op /zoeken staan (SearchForm + ZoekenPage);
// dit is alleen een sneller ingangspunt ernaartoe.
export function SearchOverlay({ variant }: { variant: "sidebar" | "mobile" }) {
  const { open, toggle, close } = useOverlay("search");
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEscapeKey(open, close);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    close();
    router.push(q ? `/zoeken?q=${encodeURIComponent(q)}` : "/zoeken");
  }

  const panel = (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3">
      <Search size={16} className="shrink-0 text-muted" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Zoek leden, bedrijven, activiteiten…"
        className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
      />
      <button
        type="button"
        onClick={close}
        aria-label="Sluiten"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-voc-red dark:hover:bg-white/[.08]"
      >
        <X size={14} />
      </button>
    </form>
  );

  if (variant === "mobile") {
    return (
      <>
        <button
          type="button"
          onClick={toggle}
          aria-label="Zoeken"
          className="flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.08]"
        >
          <Search size={18} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={close} />
            <div
              className="fixed inset-x-3 z-50 mt-3 overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
              style={{ top: "env(safe-area-inset-top)" }}
            >
              {panel}
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Zoeken"
        className={clsx(
          "flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-voc-red dark:hover:bg-white/[.08]",
          open && "bg-voc-red-light text-voc-red"
        )}
      >
        <Search size={18} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
            {panel}
          </div>
        </>
      )}
    </div>
  );
}
