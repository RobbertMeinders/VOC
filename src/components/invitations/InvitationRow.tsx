"use client";

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { Invitation } from "./InvitationList";
import { revokeInvitationAction } from "@/app/(app)/beheer/uitnodigingen/actions";

export function InvitationRow({ invitation }: { invitation: Invitation }) {
  const [copied, setCopied] = useState(false);

  const link = typeof window !== "undefined" ? `${window.location.origin}/register/${invitation.token}` : "";

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{invitation.email ?? "Geen e-mailadres opgegeven"}</p>
        <p className="text-xs text-muted">
          {ROLE_LABELS[invitation.role]} · verloopt {new Date(invitation.expires_at).toLocaleDateString("nl-NL")}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
        >
          {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
          {copied ? "Gekopieerd" : "Kopieer link"}
        </button>
        <form action={revokeInvitationAction.bind(null, invitation.id)}>
          <button
            type="submit"
            title="Intrekken"
            aria-label="Uitnodiging intrekken"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-voc-red-light hover:text-voc-red"
          >
            <X size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
