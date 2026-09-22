"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Building2, Calendar, FileText, Search, User, X } from "lucide-react";
import { clsx } from "clsx";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useOverlay } from "@/lib/ui/OverlayContext";
import { searchPreviewAction, type SearchPreviewItem } from "@/app/(app)/zoeken/preview-actions";

const TYPE_ICON = { member: User, company: Building2, activity: Calendar, document: FileText } as const;

// Los gemount zodra de overlay opent (en ge-unmount bij sluiten) zodat
// invoer/resultaten vanzelf resetten bij de volgende keer openen, zonder
// daarvoor een losse "reset on close"-effect nodig te hebben.
function SearchPanel({ close }: { close: () => void }) {
  const [value, setValue] = useState("");
  const [results, setResults] = useState<SearchPreviewItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);
  const router = useRouter();

  useEscapeKey(true, close);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleChange(newValue: string) {
    setValue(newValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = newValue.trim();
    if (query.length < 2) {
      requestId.current++;
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const id = ++requestId.current;
    debounceRef.current = setTimeout(() => {
      void searchPreviewAction(query).then((items) => {
        if (requestId.current === id) {
          setResults(items);
          setLoading(false);
        }
      });
    }, 250);
  }

  function goToFullResults() {
    const q = value.trim();
    close();
    router.push(q ? `/zoeken?q=${encodeURIComponent(q)}` : "/zoeken");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    goToFullResults();
  }

  // Portal naar document.body: dit paneel wordt op mobiel geopend vanuit de
  // MobileHeader, die backdrop-blur heeft — een filter/backdrop-filter op een
  // voorouder maakt die voorouder het containing block voor position:fixed
  // kinderen, waardoor dit paneel zonder portal in de kleine (56px) header
  // "opgesloten" zat en achter de rest van de pagina (o.a. feed-foto's) kon
  // uitkomen i.p.v. er echt overheen.
  return createPortal(
    <>
      <div className="fixed inset-0 z-40 cursor-pointer bg-black/40 animate-fade-in" onClick={close} />
      <div className="fixed inset-x-3 top-[env(safe-area-inset-top)] z-50 mt-4 sm:inset-x-0 sm:top-[30vh] sm:mx-auto sm:w-full sm:max-w-xl sm:px-3">
        <div className="animate-scale-in overflow-hidden rounded-2xl border border-border bg-surface shadow-lg">
          <form onSubmit={handleSubmit} className="flex items-center gap-3 border-b border-border p-4">
            <Search size={20} className="shrink-0 text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Zoek leden, bedrijven, activiteiten…"
              className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted"
            />
            <button
              type="button"
              onClick={close}
              aria-label="Sluiten"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-voc-red dark:hover:bg-white/[.08]"
            >
              <X size={18} />
            </button>
          </form>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && <p className="px-4 py-6 text-center text-sm text-muted">Zoeken…</p>}
            {!loading && value.trim().length >= 2 && results?.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted">Niets gevonden.</p>
            )}
            {!loading &&
              results?.map((item) => {
                const Icon = TYPE_ICON[item.type];
                return (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={item.href}
                    onClick={close}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                  >
                    {(item.type === "member" || item.type === "company") && item.avatarUrl ? (
                      <Image
                        src={item.avatarUrl}
                        alt=""
                        width={32}
                        height={32}
                        className={clsx("h-8 w-8 shrink-0 object-cover", item.type === "member" ? "rounded-full" : "rounded-lg")}
                      />
                    ) : item.type === "member" || item.type === "company" ? (
                      <span
                        className={clsx(
                          "flex h-8 w-8 shrink-0 items-center justify-center bg-voc-red-light text-xs font-medium text-voc-red",
                          item.type === "member" ? "rounded-full" : "rounded-lg"
                        )}
                      >
                        {item.initials}
                      </span>
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[.04] text-muted dark:bg-white/[.06]">
                        <Icon size={16} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
                      {item.subtitle && <span className="block truncate text-xs text-muted">{item.subtitle}</span>}
                    </span>
                  </Link>
                );
              })}
          </div>

          {value.trim().length >= 2 && (
            <button
              type="button"
              onClick={goToFullResults}
              className="block w-full border-t border-border px-4 py-2.5 text-center text-sm font-medium text-voc-red hover:bg-black/[.04] dark:hover:bg-white/[.06]"
            >
              Toon meer resultaten voor &quot;{value.trim()}&quot;
            </button>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

// Zoeken als gecentreerde overlay met live resultaten i.p.v. alleen een
// invoerveld dat je pas na op Enter drukken naar /zoeken stuurt — je ziet nu
// meteen (gedebounced) de eerste 5 treffers, met de volledige resultaten
// op /zoeken via de "Toon meer"-balk erna.
export function SearchOverlay({ variant }: { variant: "sidebar" | "mobile" }) {
  const { open, toggle, close } = useOverlay("search");

  return (
    <>
      {variant === "mobile" ? (
        <button
          type="button"
          onClick={toggle}
          aria-label="Zoeken"
          className="flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.08]"
        >
          <Search size={18} />
        </button>
      ) : (
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
      )}
      {open && <SearchPanel close={close} />}
    </>
  );
}
