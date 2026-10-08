"use client";

import { useState } from "react";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/ActionMenu";
import { isInvitationExpired, type Invitation } from "./InvitationList";
import { extendInvitationAction, revokeInvitationAction, sendInvitationEmailAction } from "@/app/(app)/beheer/uitnodigingen/actions";

function StatusBadge({ invitation }: { invitation: Invitation }) {
  if (isInvitationExpired(invitation)) {
    return <span className="rounded-full bg-voc-red-light px-2 py-0.5 text-xs font-medium text-voc-red-text">Verlopen</span>;
  }
  if (invitation.last_sent_at) {
    return (
      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
        Verstuurd {new Date(invitation.last_sent_at).toLocaleDateString("nl-NL")}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-black/[.06] px-2 py-0.5 text-xs font-medium text-muted dark:bg-white/[.08]">
      Niet verstuurd
    </span>
  );
}

export function InvitationRow({
  invitation,
  selected,
  onToggleSelected,
}: {
  invitation: Invitation;
  selected: boolean;
  onToggleSelected: () => void;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const link = typeof window !== "undefined" ? `${window.location.origin}/register/${invitation.token}` : "";
  const name = [invitation.first_name, invitation.last_name].filter(Boolean).join(" ");

  // Vergelijkt de huidige waarde i.p.v. een losse timeout-ref bij te houden
  // -- scheelt het opruimen/overschrijven van een eerdere timer als iemand
  // snel twee menu-acties achter elkaar uitvoert.
  function showFeedback(message: string) {
    setFeedback(message);
    setTimeout(() => setFeedback((current) => (current === message ? null : current)), 2500);
  }

  const items: ActionMenuItem[] = [];
  if (invitation.email) {
    items.push({
      label: "Verstuur e-mail",
      onClick: async () => {
        const { error } = await sendInvitationEmailAction(invitation.id);
        showFeedback(error ?? "E-mail verstuurd.");
      },
    });
  }
  items.push({
    label: "Kopieer link",
    onClick: () => {
      void navigator.clipboard.writeText(link);
      showFeedback("Link gekopieerd.");
    },
  });
  items.push({
    label: "Verleng met 14 dagen",
    onClick: () => {
      void extendInvitationAction(invitation.id);
    },
  });
  items.push({
    label: "Intrekken",
    danger: true,
    onClick: () => {
      void revokeInvitationAction(invitation.id);
    },
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-2.5 last:border-0">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <input type="checkbox" checked={selected} onChange={onToggleSelected} className="shrink-0 rounded" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {name || invitation.email || "Geen naam/e-mailadres opgegeven"}
            {invitation.company && <span className="font-normal text-muted"> — {invitation.company.name}</span>}
          </p>
          <p className="truncate text-xs text-muted">
            {name && invitation.email ? `${invitation.email} · ` : ""}
            {ROLE_LABELS[invitation.role]} ·{" "}
            {invitation.expires_at
              ? `verloopt ${new Date(invitation.expires_at).toLocaleDateString("nl-NL")}`
              : "verloopt pas na versturen"}
          </p>
          {feedback && <p className="mt-0.5 text-xs text-muted">{feedback}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge invitation={invitation} />
        <ActionMenu items={items} />
      </div>
    </div>
  );
}
