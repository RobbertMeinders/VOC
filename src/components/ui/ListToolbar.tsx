"use client";

import { useState } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { Input } from "@/components/ui/Input";
import { FloatingPortal } from "@/components/ui/FloatingPortal";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useBodyScrollLock } from "@/lib/dom/useBodyScrollLock";

// UX-review Z1-Z4: vervangt de losse, per-lijst herhaalde combinatie van een
// zoekveld (zonder ×, teller of label) en native <select>-filters door één
// gedeelde toolbar. De lijst zelf blijft verantwoordelijk voor het filteren
// (client-side, zie matchesSearch in lib/search/normalize.ts) en voor het
// synchroniseren met de URL (useUrlFilterState) — deze component is puur de
// UI eromheen.
export type ListToolbarFilter = {
  key: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
};

export function FilterChipGroup({ filter }: { filter: ListToolbarFilter }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted">{filter.label}:</span>
      <button
        type="button"
        onClick={() => filter.onChange("")}
        className={clsx(
          "rounded-full px-2.5 py-1 text-xs font-medium",
          !filter.value ? "bg-voc-red text-white" : "bg-black/[.06] text-muted hover:text-foreground dark:bg-white/[.08]"
        )}
      >
        Alle
      </button>
      {filter.options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => filter.onChange(option.value)}
          className={clsx(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            filter.value === option.value
              ? "bg-voc-red text-white"
              : "bg-black/[.06] text-muted hover:text-foreground dark:bg-white/[.08]"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function FilterPanelGroup({ filter }: { filter: ListToolbarFilter }) {
  const [open, setOpen] = useState(false);
  useEscapeKey(open, () => setOpen(false));
  useBodyScrollLock(open);

  const activeLabel = filter.options.find((o) => o.value === filter.value)?.label ?? "Alle";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
      >
        {filter.label}: {activeLabel}
        <ChevronDown size={13} />
      </button>
      {open && (
        <FloatingPortal>
          <div
            className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
            onClick={() => setOpen(false)}
          >
            <div
              className="animate-scale-in w-full max-w-sm rounded-t-2xl border border-border bg-surface p-4 shadow-lg sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">{filter.label}</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Sluiten"
                  className="rounded-full p-1 text-muted hover:bg-black/[.06] hover:text-foreground dark:hover:bg-white/[.08]"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex max-h-[60vh] flex-col gap-0.5 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    filter.onChange("");
                    setOpen(false);
                  }}
                  className={clsx(
                    "rounded-lg px-3 py-2 text-left text-sm",
                    !filter.value ? "bg-voc-red-light text-voc-red-text" : "text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                  )}
                >
                  Alle
                </button>
                {filter.options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      filter.onChange(option.value);
                      setOpen(false);
                    }}
                    className={clsx(
                      "rounded-lg px-3 py-2 text-left text-sm",
                      filter.value === option.value
                        ? "bg-voc-red-light text-voc-red-text"
                        : "text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

export function FilterControl({ filter }: { filter: ListToolbarFilter }) {
  return filter.options.length <= 5 ? <FilterChipGroup filter={filter} /> : <FilterPanelGroup filter={filter} />;
}

export function ListToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  resultCount,
  totalCount,
  filters = [],
  showFilterButtons = true,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  resultCount: number;
  totalCount: number;
  filters?: ListToolbarFilter[];
  /** Zet op false als de filter-knoppen al elders (bv. naast een weergave-toggle) worden getoond — de actieve-filter-chips en "Alles wissen" blijven dan wel werken. */
  showFilterButtons?: boolean;
}) {
  const activeFilters = filters.filter((f) => f.value);
  const hasActiveFilter = activeFilters.length > 0 || Boolean(searchValue);

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="pl-9 pr-9"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Zoekopdracht wissen"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-black/[.06] hover:text-foreground dark:hover:bg-white/[.08]"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <p className="shrink-0 text-xs text-muted sm:text-right">
          {resultCount} van {totalCount}
        </p>
      </div>

      {showFilterButtons && filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <FilterControl key={filter.key} filter={filter} />
          ))}
        </div>
      )}

      {hasActiveFilter && (
        <div className="flex flex-wrap items-center gap-1.5">
          {searchValue && (
            <span className="flex items-center gap-1 rounded-full bg-black/[.06] px-2.5 py-1 text-xs text-muted dark:bg-white/[.08]">
              “{searchValue}”
              <button type="button" onClick={() => onSearchChange("")} aria-label="Zoekopdracht wissen">
                <X size={12} />
              </button>
            </span>
          )}
          {activeFilters.map((filter) => (
            <span
              key={filter.key}
              className="flex items-center gap-1 rounded-full bg-black/[.06] px-2.5 py-1 text-xs text-muted dark:bg-white/[.08]"
            >
              {filter.label}: {filter.options.find((o) => o.value === filter.value)?.label ?? filter.value}
              <button type="button" onClick={() => filter.onChange("")} aria-label={`${filter.label}-filter wissen`}>
                <X size={12} />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => {
              onSearchChange("");
              for (const filter of filters) filter.onChange("");
            }}
            className="text-xs font-medium text-voc-red-text hover:underline"
          >
            Alles wissen
          </button>
        </div>
      )}
    </div>
  );
}
