"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  return (
    <button
      type="button"
      title="Verwijderen"
      aria-label="Verwijderen"
      disabled={isPending}
      onClick={() => {
        if (window.confirm(confirmMessage)) {
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
      className={className ?? "text-muted hover:text-voc-red disabled:opacity-50"}
    >
      <Trash2 size={size} />
    </button>
  );
}
