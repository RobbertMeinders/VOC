"use client";

import { useState } from "react";
import { Check, Clock, Copy, Mail, X } from "lucide-react";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { Invitation } from "./InvitationList";
import {
  extendInvitationAction,
  revokeInvitationAction,
  sendInvitationEmailAction,
} from "@/app/(app)/beheer/uitnodigingen/actions";

export function InvitationRow({ invitation }: { invitation: Invitation }) {
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const link = typeof window !== "undefined" ? `${window.location.origin}/register/${invitation.token}` : "";
  const name = [invitation.first_name, invitation.last_name].filter(Boolean).join(" ");

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function sendEmail() {
    setSending(true);
    setSendResult(null);
    const { error } = await sendInvitationEmailAction(invitation.id);
    setSending(false);
    setSendResult(error ?? "verstuurd");
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">
          {name || invitation.email || "Geen naam/e-mailadres opgegeven"}
        </p>
        <p className="text-xs text-muted">
          {name && invitation.email ? `${invitation.email} · ` : ""}
          {ROLE_LABELS[invitation.role]} · verloopt {new Date(invitation.expires_at).toLocaleDateString("nl-NL")}
        </p>
        {sendResult && (
          <p className={`mt-1 text-xs ${sendResult === "verstuurd" ? "text-green-600" : "text-voc-red"}`}>
            {sendResult === "verstuurd" ? "E-mail verstuurd." : sendResult}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {invitation.email && (
          <button
            type="button"
            onClick={sendEmail}
            disabled={sending}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-black/[.04] disabled:opacity-50 dark:hover:bg-white/[.06]"
          >
            <Mail size={14} />
            {sending ? "Versturen…" : "Verstuur e-mail"}
          </button>
        )}
        <button
          type="button"
          onClick={copyLink}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
        >
          {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
          {copied ? "Gekopieerd" : "Kopieer link"}
        </button>
        <form action={extendInvitationAction.bind(null, invitation.id)}>
          <button
            type="submit"
            title="Verleng met 14 dagen"
            aria-label="Uitnodiging verlengen"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-black/[.04] dark:hover:bg-white/[.06]"
          >
            <Clock size={16} />
          </button>
        </form>
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
