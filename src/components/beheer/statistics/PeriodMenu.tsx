"use client";

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { FloatingPortal } from "@/components/ui/FloatingPortal";
import { useFixedAnchor } from "@/lib/dom/useFixedAnchor";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { PERIOD_OPTIONS, type StatsPeriod } from "@/lib/statistics/period";

const MENU_WIDTH = 248;

// useSearchParams vereist een Suspense-grens binnen de client-boom — zelfde
// patroon als BeheerLedenListClient/MemberListClient: de buitenste export is
// puur een Suspense-wrapper, de echte component zit in PeriodMenuInner.
export function PeriodMenu(props: { period: StatsPeriod; compare: boolean }) {
  return (
    <Suspense fallback={<div className="h-9 w-[150px] shrink-0 animate-pulse rounded-xl bg-raised" />}>
      <PeriodMenuInner {...props} />
    </Suspense>
  );
}

function PeriodMenuInner({ period, compare }: { period: StatsPeriod; compare: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const { anchorRef, rect } = useFixedAnchor<HTMLButtonElement>(open);
  useEscapeKey(open, () => setOpen(false));

  function navigate(next: { periode?: StatsPeriod; vergelijk?: boolean }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.periode) params.set("periode", next.periode);
    if (next.vergelijk !== undefined) params.set("vergelijk", next.vergelijk ? "1" : "0");
    router.push(`${pathname}?${params.toString()}`);
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
        className="flex h-9 items-center gap-2 rounded-xl border border-border bg-surface px-3.5 text-sm font-semibold text-foreground hover:border-muted"
      >
        {currentLabel}
        <ChevronDown size={15} className={clsx("text-muted transition-transform duration-150", open && "rotate-180")} />
      </button>

      {open && rect && (
        <FloatingPortal>
          <div className="fixed inset-0 z-40 cursor-pointer" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="animate-scale-in origin-top-right fixed z-50 flex w-[248px] flex-col gap-0.5 rounded-2xl border border-border bg-surface p-1.5 shadow-lg"
            style={{ top: rect.bottom + 8, left: Math.max(8, rect.right - MENU_WIDTH) }}
          >
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.key}
                type="button"
                role="menuitemradio"
                aria-checked={p.key === period}
                onClick={() => {
                  navigate({ periode: p.key });
                  setOpen(false);
                }}
                className={clsx(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-black/[.04] dark:hover:bg-white/[.06]",
                  p.key === period ? "font-semibold text-foreground" : "font-medium text-foreground"
                )}
              >
                {p.label}
                {p.key === period && <Check size={15} className="text-petrol" />}
              </button>
            ))}
            <hr className="my-1 border-border" />
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]">
              <input
                type="checkbox"
                checked={compare}
                onChange={(e) => navigate({ vergelijk: e.target.checked })}
                className="h-4 w-4 accent-petrol"
              />
              Vergelijk met vorige periode
            </label>
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}
