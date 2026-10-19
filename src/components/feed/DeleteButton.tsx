"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useConfirm } from "@/lib/ui/ConfirmDialogContext";
import { useToast } from "@/lib/ui/ToastContext";

// next/navigation's redirect() throws internally to unwind the render; that
// throw must always be allowed through, never caught as a "real" error
// (zelfde check als in agenda/actions.ts e.a.).
function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

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
  const toast = useToast();

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
            try {
              await onDelete();
              // Server Components lijst-pagina's tonen de verwijderde rij pas
              // weg na een refresh — een server action die zelf redirect()
              // aanroept (detailpagina's) heeft dit niet nodig, maar dan is
              // deze refresh onschadelijk: de navigatie is er dan al overheen.
              router.refresh();
            } catch (cause) {
              if (isNextRedirectError(cause)) throw cause;
              // F9: zonder deze catch verdween een bewuste foutmelding van
              // de server action (bv. "kan niet verwijderd worden, heeft
              // nog aanmeldingen") spoorloos in een onopgevangen rejection
              // i.p.v. leesbaar getoond te worden.
              toast(cause instanceof Error && cause.message ? cause.message : "Verwijderen is niet gelukt.");
            }
          });
        }
      }}
      // Redesign: verwijder-iconen in lijsten zijn neutraal — alleen de
      // bevestigingsknop in het dialoogvenster hierboven (danger: true)
      // blijft rood.
      className={className ?? "text-muted hover:text-foreground disabled:opacity-50"}
    >
      <Trash2 size={size} />
    </button>
  );
}
