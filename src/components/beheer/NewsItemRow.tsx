"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { DeleteButton } from "@/components/feed/DeleteButton";
import { NewsItemForm } from "./NewsItemForm";
import { deleteNewsItemAction, moveNewsItemAction } from "@/app/(app)/beheer/nieuws/actions";
import type { Database } from "@/lib/types/database";

type NewsItem = Database["public"]["Tables"]["news_items"]["Row"];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export function NewsItemRow({
  item,
  imageUrl,
  isFirst,
  isLast,
}: {
  item: NewsItem;
  imageUrl: string | null;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (editing) {
    return <NewsItemForm item={item} imageUrl={imageUrl} onDone={() => setEditing(false)} />;
  }

  function move(direction: "up" | "down") {
    startTransition(async () => {
      await moveNewsItemAction(item.id, direction);
    });
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm">
      <div className="flex shrink-0 flex-col">
        <button
          type="button"
          onClick={() => move("up")}
          disabled={isFirst || isPending}
          title="Omhoog"
          aria-label="Naar boven verplaatsen"
          className="flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-black/[.04] hover:text-voc-red-text disabled:opacity-25 disabled:hover:bg-transparent dark:hover:bg-white/[.08]"
        >
          <ChevronUp size={16} />
        </button>
        <button
          type="button"
          onClick={() => move("down")}
          disabled={isLast || isPending}
          title="Omlaag"
          aria-label="Naar beneden verplaatsen"
          className="flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-black/[.04] hover:text-voc-red-text disabled:opacity-25 disabled:hover:bg-transparent dark:hover:bg-white/[.08]"
        >
          <ChevronDown size={16} />
        </button>
      </div>
      {imageUrl && (
        <Image src={imageUrl} alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
        {item.subtitle && <p className="truncate text-xs text-muted">{item.subtitle}</p>}
        <p className="mt-0.5 text-xs text-muted">{formatDate(item.created_at)}</p>
      </div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Bewerken"
        aria-label="Bewerken"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-voc-red-text dark:hover:bg-white/[.08]"
      >
        <Pencil size={16} />
      </button>
      <DeleteButton
        confirmMessage={`Weet je zeker dat je "${item.title}" wilt verwijderen?`}
        onDelete={deleteNewsItemAction.bind(null, item.id)}
      />
    </div>
  );
}
