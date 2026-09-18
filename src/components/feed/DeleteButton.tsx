"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

export function DeleteButton({
  onDelete,
  confirmMessage,
  className,
  size = 14,
}: {
  onDelete: () => Promise<void>;
  confirmMessage: string;
  className?: string;
  size?: number;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      title="Verwijderen"
      aria-label="Verwijderen"
      disabled={isPending}
      onClick={() => {
        if (window.confirm(confirmMessage)) {
          startTransition(onDelete);
        }
      }}
      className={className ?? "text-muted hover:text-voc-red disabled:opacity-50"}
    >
      <Trash2 size={size} />
    </button>
  );
}
