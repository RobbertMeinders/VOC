"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useBodyScrollLock } from "@/lib/dom/useBodyScrollLock";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Liker } from "@/app/(app)/actions";

// Overlay met wie een bericht of reactie geliked heeft — lazy geladen pas
// bij openen (net als NotificationCenter), niet vooraf voor elk bericht.
export function LikersOverlay({
  title,
  fetchLikers,
  onClose,
}: {
  title: string;
  fetchLikers: () => Promise<Liker[]>;
  onClose: () => void;
}) {
  const [likers, setLikers] = useState<Liker[] | null>(null);

  useEscapeKey(true, onClose);
  useBodyScrollLock(true);

  useEffect(() => {
    void fetchLikers().then(setLikers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 animate-fade-in" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:w-80 sm:-translate-x-1/2">
        <div className="animate-scale-in max-h-[70vh] overflow-hidden rounded-2xl border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Sluiten"
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-voc-red dark:hover:bg-white/[.08]"
            >
              <X size={16} />
            </button>
          </div>
          <div className="max-h-[55vh] overflow-y-auto">
            {likers === null &&
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            {likers !== null && likers.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted">Nog niemand.</p>
            )}
            {likers?.map((liker) => (
              <Link
                key={liker.id}
                href={`/leden/${liker.id}`}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
              >
                <Avatar firstName={liker.firstName} lastName={liker.lastName} avatarUrl={liker.avatarUrl} size={32} />
                <span className="text-sm font-medium text-foreground">
                  {liker.firstName} {liker.lastName}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
