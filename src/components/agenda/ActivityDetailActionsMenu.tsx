"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/ActionMenu";
import { useConfirm } from "@/lib/ui/ConfirmDialogContext";
import { useToast } from "@/lib/ui/ToastContext";
import { CancelActivityButton } from "@/components/agenda/CancelActivityButton";
import { createCommunicationFromActivityAction } from "@/app/(app)/beheer/communicatie/actions";
import { deleteActivityAction } from "@/app/(app)/agenda/actions";

// next/navigation's redirect() throws internally to unwind the render; that
// throw must always be allowed through, never caught as a "real" error
// (zelfde check als in agenda/actions.ts, DeleteButton e.a.).
function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

// C8/E3: verving vier losse knoppen (Bewerken, Communiceer, Downloaden,
// Afgelasten/Verwijderen) door Bewerken + dit "..."-menu, zoals elders in
// Beheer al de norm is. Bewerken blijft als eigen knop staan (hoofdactie),
// de rest zit hier.
export function ActivityDetailActionsMenu({
  activityId,
  activityTitle,
  canCancel,
}: {
  activityId: string;
  activityTitle: string;
  // true: activiteit heeft (wachtlijst-)aanmeldingen en is niet al afgelast
  // -> Afgelasten i.p.v. Verwijderen (zie deleteActivityAction's eigen
  // aanmeldingen-check).
  canCancel: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [, startTransition] = useTransition();

  function handleCommunicate() {
    startTransition(async () => {
      try {
        await createCommunicationFromActivityAction(activityId);
      } catch (cause) {
        if (isNextRedirectError(cause)) throw cause;
        toast("Aanmaken is niet gelukt. Probeer het opnieuw.");
      }
    });
  }

  function handleDownload() {
    const a = document.createElement("a");
    a.href = `/agenda/${activityId}/registraties.csv`;
    a.click();
  }

  async function handleDelete() {
    const confirmed = await confirm({
      title: "Verwijderen?",
      description: "Weet je zeker dat je deze activiteit wilt verwijderen?",
      confirmLabel: "Verwijderen",
      danger: true,
    });
    if (!confirmed) return;
    startTransition(async () => {
      try {
        await deleteActivityAction(activityId);
        router.refresh();
      } catch (cause) {
        if (isNextRedirectError(cause)) throw cause;
        toast(cause instanceof Error && cause.message ? cause.message : "Verwijderen is niet gelukt.");
      }
    });
  }

  const items: ActionMenuItem[] = [
    { label: "Nieuwsbrief maken", onClick: handleCommunicate },
    { label: "Aanmeldingen downloaden", onClick: handleDownload },
    canCancel
      ? { label: "Afgelasten", danger: true, onClick: () => setCancelOpen(true) }
      : { label: "Verwijderen", danger: true, onClick: handleDelete },
  ];

  return (
    <>
      <ActionMenu items={items} />
      {canCancel && (
        <CancelActivityButton activityId={activityId} activityTitle={activityTitle} open={cancelOpen} onOpenChange={setCancelOpen} />
      )}
    </>
  );
}
