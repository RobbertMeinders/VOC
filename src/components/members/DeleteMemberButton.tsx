"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteMemberAction } from "@/app/(app)/leden/[id]/actions";
import { useConfirm } from "@/lib/ui/ConfirmDialogContext";

export function DeleteMemberButton({ memberId, memberName }: { memberId: string; memberName: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  async function handleClick() {
    const confirmed = await confirm({
      title: "Lid verwijderen?",
      description:
        `${memberName} wordt direct uitgelogd en ontkoppeld van het eigen bedrijf, en verdwijnt uit de ledenlijst. ` +
        'Persoonsgegevens (naam, e-mail, telefoon, foto, functie, bio) worden meteen gewist. Geplaatste berichten ' +
        'en reacties blijven staan, wel voortaan onder "Verwijderd lid". Dit kan niet ongedaan worden gemaakt.',
      confirmLabel: "Verwijderen",
      danger: true,
    });
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteMemberAction(memberId);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        title="Verwijderen"
        aria-label={`${memberName} verwijderen`}
        className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-voc-red-text hover:bg-voc-red-light disabled:opacity-60"
      >
        <Trash2 size={14} />
        {isPending ? "Bezig…" : "Verwijderen"}
      </button>
      {error && <p className="text-xs text-voc-red-text">{error}</p>}
    </div>
  );
}
