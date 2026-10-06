"use client";

import { useState } from "react";
import Image from "next/image";
import { Pencil } from "lucide-react";
import { DeleteButton } from "@/components/feed/DeleteButton";
import { NewsItemForm } from "./NewsItemForm";
import { deleteNewsItemAction } from "@/app/(app)/beheer/nieuws/actions";
import type { Database } from "@/lib/types/database";

type NewsItem = Database["public"]["Tables"]["news_items"]["Row"];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export function NewsItemRow({ item, imageUrl }: { item: NewsItem; imageUrl: string | null }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <NewsItemForm item={item} imageUrl={imageUrl} onDone={() => setEditing(false)} />;
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm">
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
