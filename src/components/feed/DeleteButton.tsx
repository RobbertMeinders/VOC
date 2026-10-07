"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useConfirm } from "@/lib/ui/ConfirmDialogContext";

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
  const router = useRouter();
  const confirm = useConfirm();

  return (
    <button
      type="button"
      title="Verwijderen"
      aria-label="Verwijderen"
      disabled={isPending}
      onClick={async () => {
        const confirmed = await confirm({ title: "Verwijderen?", description: confirmMessage, confirmLabel: "Verwijderen", danger: true });
        if (confirmed) {
          startTransition(async () => {
            await onDelete();
            // Server Components lijst-pagina's tonen de verwijderde rij pas
            // weg na een refresh — een server action die zelf redirect()
            // aanroept (detailpagina's) heeft dit niet nodig, maar dan is
            // deze refresh onschadelijk: de navigatie is er dan al overheen.
            router.refresh();
          });
        }
      }}
      className={className ?? "text-muted hover:text-voc-red-text disabled:opacity-50"}
    >
      <Trash2 size={size} />
    </button>
  );
}
