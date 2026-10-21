"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { FloatingPortal } from "@/components/ui/FloatingPortal";
import { useFixedAnchor } from "@/lib/dom/useFixedAnchor";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { PERIOD_OPTIONS, type StatsPeriod } from "@/lib/statistics/period";
import { useStatsNav } from "./StatsNavContext";

const MENU_WIDTH = 248;

// useSearchParams vereist een Suspense-grens binnen de client-boom — zelfde
// patroon als BeheerLedenListClient/MemberListClient: de buitenste export is
// puur een Suspense-wrapper, de echte component zit in PeriodMenuInner.
export function PeriodMenu(props: { period: StatsPeriod; compare: boolean }) {
  return (
    <Suspense fallback={<div className="h-11 w-[150px] shrink-0 animate-pulse rounded-xl bg-raised" />}>
      <PeriodMenuInner {...props} />
    </Suspense>
  );
}

function PeriodMenuInner({ period, compare }: { period: StatsPeriod; compare: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { navigate: goTo, isPending } = useStatsNav();
  const [open, setOpen] = useState(false);
  const { anchorRef, rect } = useFixedAnchor<HTMLButtonElement>(open);
  // Foutenrapport M8: Esc sloot het menu al, maar liet de focus ergens
  // midden in het (dan verdwenen) menu achter i.p.v. terug op de knop.
  const close = () => {
    setOpen(false);
    anchorRef.current?.focus();
  };
  useEscapeKey(open, close);

  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  // Bij openen: focus naar de actieve periode (of de eerste optie), i.p.v.
  // op de knop te laten staan — zonder dit deed Tab/pijl-omlaag niets
  // zinnigs, want er stond nergens focus binnen het menu zelf.
  useEffect(() => {
    if (!open) return;
    const activeIndex = PERIOD_OPTIONS.findIndex((p) => p.key === period);
    itemRefs.current[Math.max(activeIndex, 0)]?.focus();
  }, [open, period]);

  function navigate(next: { periode?: StatsPeriod; vergelijk?: boolean }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.periode) params.set("periode", next.periode);
    if (next.vergelijk !== undefined) params.set("vergelijk", next.vergelijk ? "1" : "0");
    goTo(`${pathname}?${params.toString()}`);
  }

  // Roving focus binnen het menu: pijl omhoog/omlaag, Home/End — Tab sluit
  // het menu en zet de focus terug op de knop i.p.v. in een geportaald menu
  // aan het eind van <body> te blijven hangen (waar Tab anders naartoe zou
  // springen, ver voorbij de knop).
  function handleMenuKeyDown(e: React.KeyboardEvent) {
    const items = itemRefs.current.filter((el): el is HTMLElement => el !== null);
    const currentIndex = items.findIndex((el) => el === document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(currentIndex + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(currentIndex - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === "Tab") {
      e.preventDefault();
      close();
    }
  }

  const currentLabel = PERIOD_OPTIONS.find((p) => p.key === period)?.label ?? period;

  return (
    <div className="relative shrink-0">
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={isPending}
        // Foutenrapport M2/L11: whitespace-nowrap voorkomt dat de labeltekst
        // ("Laatste 30 dagen") over drie regels breekt op mobiel; h-11 (44px)
        // i.p.v. h-9 (36px) haalt de iOS/Material-tikdoelrichtlijn.
        className="flex h-11 items-center gap-2 whitespace-nowrap rounded-xl border border-border bg-surface px-3.5 text-sm font-semibold text-foreground hover:border-muted disabled:cursor-wait disabled:opacity-60"
      >
        {currentLabel}
        <ChevronDown size={15} className={clsx("text-muted transition-transform duration-150", open && "rotate-180")} />
      </button>

      {open && rect && (
        <FloatingPortal>
          <div className="fixed inset-0 z-40 cursor-pointer" onClick={close} />
          <div
            role="menu"
            onKeyDown={handleMenuKeyDown}
            className="animate-scale-in origin-top-right fixed z-50 flex w-[248px] flex-col gap-0.5 rounded-2xl border border-border bg-surface p-1.5 shadow-lg"
            style={{ top: rect.bottom + 8, left: Math.max(8, rect.right - MENU_WIDTH) }}
          >
            {PERIOD_OPTIONS.map((p, i) => (
              <button
                key={p.key}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={p.key === period}
                disabled={isPending}
                onClick={() => {
                  navigate({ periode: p.key });
                  close();
                }}
                className={clsx(
                  "flex min-h-11 items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-black/[.04] dark:hover:bg-white/[.06]",
                  p.key === period ? "font-semibold text-foreground" : "font-medium text-foreground"
                )}
              >
                {p.label}
                {p.key === period && <Check size={15} className="text-petrol" />}
              </button>
            ))}
            <hr className="my-1 border-border" />
            <button
              type="button"
              ref={(el) => {
                itemRefs.current[PERIOD_OPTIONS.length] = el;
              }}
              role="menuitemcheckbox"
              aria-checked={compare}
              onClick={() => navigate({ vergelijk: !compare })}
              className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
            >
              <span
                aria-hidden
                className={clsx(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                  compare ? "border-petrol bg-petrol text-white" : "border-border"
                )}
              >
                {compare && <Check size={12} />}
              </span>
              Vergelijk met vorige periode
            </button>
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}
