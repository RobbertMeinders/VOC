"use client";

import { useEffect, useState } from "react";
import { Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/lib/ui/ConfirmDialogContext";
import { AVATAR_LOGO_THUMBNAIL_DIMENSION, CARD_THUMBNAIL_DIMENSION, createThumbnailFile } from "@/lib/image/compress";
import {
  getThumbnailBackfillQueueAction,
  applyThumbnailBackfillAction,
  type BackfillCategory,
  type BackfillQueueItem,
  type ThumbnailBackfillQueue,
} from "@/app/(app)/beheer/thumbnails/actions";

const CATEGORY_LABELS: Record<BackfillCategory, string> = {
  profiles: "Leden (profielfoto's)",
  companies: "Bedrijven (logo's)",
  activities: "Activiteiten (foto's)",
  feed_attachments: "Community (feedfoto's)",
};

const CATEGORY_DIMENSION: Record<BackfillCategory, number> = {
  profiles: AVATAR_LOGO_THUMBNAIL_DIMENSION,
  companies: AVATAR_LOGO_THUMBNAIL_DIMENSION,
  activities: CARD_THUMBNAIL_DIMENSION,
  feed_attachments: CARD_THUMBNAIL_DIMENSION,
};

function queueEntries(queue: ThumbnailBackfillQueue): [BackfillCategory, BackfillQueueItem[]][] {
  return [
    ["profiles", queue.profiles],
    ["companies", queue.companies],
    ["activities", queue.activities],
    ["feed_attachments", queue.feedAttachments],
  ];
}

function queueTotal(queue: ThumbnailBackfillQueue): number {
  return queueEntries(queue).reduce((sum, [, items]) => sum + items.length, 0);
}

type Progress = { processed: number; total: number; success: number; skipped: number; failed: number };

// Verwerkt één item: haalt het origineel op via de al-gesigneerde URL uit de
// wachtrij, maakt er client-side (dezelfde canvaslogica als een gewone
// upload, zie lib/image/compress.ts) een kleine versie van, en stuurt
// alleen dat kleine bestand naar de server — er wordt hier nergens op
// Vercel zelf een afbeelding bewerkt. Een fout bij dit ene bestand wordt
// gelogd (console + teller), nooit doorgegooid: de aanroeper gaat gewoon
// door met het volgende item.
async function processItem(category: BackfillCategory, item: BackfillQueueItem): Promise<"success" | "skipped" | "failed"> {
  if (!item.url) {
    console.error(`[thumbnails] geen signed URL voor ${category}/${item.id} (${item.path})`);
    return "failed";
  }

  try {
    const response = await fetch(item.url);
    if (!response.ok) throw new Error(`HTTP ${response.status} bij ophalen origineel`);
    const blob = await response.blob();
    const fileName = item.path.split("/").pop() ?? "origineel";
    const file = new File([blob], fileName, { type: blob.type });

    const thumb = await createThumbnailFile(file, CATEGORY_DIMENSION[category]);
    if (!thumb) throw new Error("Thumbnail genereren is mislukt (onherkenbaar beeldformaat?)");

    const formData = new FormData();
    formData.set("category", category);
    formData.set("rowId", item.id);
    formData.set("thumb", thumb);
    const result = await applyThumbnailBackfillAction(formData);
    if (result.error) throw new Error(result.error);

    return result.skipped ? "skipped" : "success";
  } catch (cause) {
    console.error(`[thumbnails] mislukt voor ${category}/${item.id} (${item.path}):`, cause);
    return "failed";
  }
}

export function ThumbnailBackfillContent() {
  const confirm = useConfirm();
  const [queue, setQueue] = useState<ThumbnailBackfillQueue | null>(null);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [running, setRunning] = useState(false);

  async function loadQueue() {
    setLoadingQueue(true);
    try {
      setQueue(await getThumbnailBackfillQueueAction());
    } finally {
      setLoadingQueue(false);
    }
  }

  // loadQueue() zelf (hergebruikt door de ververs-knop en na afloop van een
  // run) zet loadingQueue synchroon terug op true vóór de await — prima
  // vanuit een knop-klik, maar binnen een effect telt dat als "setState
  // synchroon in een effect". loadingQueue start daarom al op true, en de
  // state-updates hier gebeuren pas in de .then/.finally-callbacks, ná de
  // synchrone effect-uitvoering.
  useEffect(() => {
    getThumbnailBackfillQueueAction()
      .then(setQueue)
      .finally(() => setLoadingQueue(false));
  }, []);

  async function handleStart() {
    if (!queue) return;
    const total = queueTotal(queue);
    if (total === 0) return;

    const confirmed = await confirm({
      title: "Kleine versies aanmaken?",
      description: `Dit verwerkt ${total} bestaande foto's één voor één (origineel blijft altijd staan). Dit kan enkele minuten duren — je kunt dit scherm open laten staan tot het klaar is.`,
      confirmLabel: "Start",
    });
    if (!confirmed) return;

    setRunning(true);
    const items: [BackfillCategory, BackfillQueueItem][] = queueEntries(queue).flatMap(([category, categoryItems]) =>
      categoryItems.map((item) => [category, item] as [BackfillCategory, BackfillQueueItem])
    );
    setProgress({ processed: 0, total: items.length, success: 0, skipped: 0, failed: 0 });

    for (const [category, item] of items) {
      const outcome = await processItem(category, item);
      setProgress((prev) =>
        prev
          ? {
              ...prev,
              processed: prev.processed + 1,
              success: prev.success + (outcome === "success" ? 1 : 0),
              skipped: prev.skipped + (outcome === "skipped" ? 1 : 0),
              failed: prev.failed + (outcome === "failed" ? 1 : 0),
            }
          : prev
      );
    }

    setRunning(false);
    await loadQueue();
  }

  const total = queue ? queueTotal(queue) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-foreground">Nog te verwerken</p>
          <button
            type="button"
            onClick={() => void loadQueue()}
            disabled={loadingQueue || running}
            aria-label="Vernieuwen"
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-voc-red-text disabled:opacity-50 dark:hover:bg-white/[.08]"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {loadingQueue && !queue ? (
          <p className="mt-3 text-sm text-muted">Bezig met tellen…</p>
        ) : queue ? (
          <div className="mt-3 flex flex-col gap-1.5">
            {queueEntries(queue).map(([category, items]) => (
              <div key={category} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{CATEGORY_LABELS[category]}</span>
                <span className="text-muted">{items.length}</span>
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between border-t border-border pt-1.5 text-sm font-medium">
              <span className="text-foreground">Totaal</span>
              <span className="text-foreground">{total}</span>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <Button type="button" onClick={handleStart} disabled={running || loadingQueue || total === 0}>
            <Play size={16} />
            {running ? "Bezig…" : total === 0 ? "Niets te doen" : `Start (${total})`}
          </Button>
        </div>

        {progress && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-black/[.06] dark:bg-white/[.08]">
              <div
                className="h-full rounded-full bg-voc-red transition-all duration-150"
                style={{ width: `${progress.total > 0 ? (progress.processed / progress.total) * 100 : 0}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted">
              {progress.processed} van {progress.total} verwerkt — {progress.success} gelukt, {progress.skipped} al gedaan
              {progress.failed > 0 && `, ${progress.failed} mislukt (zie console-log)`}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
