"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { sendInvitationEmailAction } from "@/app/(app)/beheer/uitnodigingen/actions";
import { useToast } from "@/lib/ui/ToastContext";

// Gedeeld tussen Beheer -> Leden (personenmodel Fase 1b) en de "Aangemeld
// via de website"-sectie op een activiteit (Fase 2) -- allebei hergebruiken
// dezelfde bestaande verstuuractie (sendInvitationEmailAction) i.p.v. een
// eigen actie te bouwen.
export function InvitationResendButton({ invitationId }: { invitationId: string }) {
  const [pending, setPending] = useState(false);
  const toast = useToast();

  async function handleClick() {
    setPending(true);
    const { error } = await sendInvitationEmailAction(invitationId);
    setPending(false);
    toast(error ?? "Uitnodiging opnieuw verstuurd.");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label="Uitnodiging opnieuw versturen"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:border-muted disabled:opacity-50"
    >
      <Send size={13} />
    </button>
  );
}
