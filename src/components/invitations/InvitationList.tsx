"use client";

import { Suspense, useMemo, useState } from "react";
import { Clock, Mail, X } from "lucide-react";
import type { Database } from "@/lib/types/database";
import { InvitationRow } from "./InvitationRow";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { matchesSearch } from "@/lib/search/normalize";
import { useUrlFilterState } from "@/lib/dom/useUrlFilterState";
import {
  bulkExtendInvitationsAction,
  bulkRevokeInvitationsAction,
  bulkSendInvitationEmailsAction,
} from "@/app/(app)/beheer/uitnodigingen/actions";

export type Invitation = Database["public"]["Tables"]["invitations"]["Row"] & {
  company: { name: string } | null;
};

// "Verlopen" wordt bewust niet uit invitations.status gelezen — die blijft
// altijd "pending" (er is geen cron die 'm omzet naar het bestaande
// 'expired'-enumlid), dus de echte status komt uit expires_at vs. nu.
export function isInvitationExpired(invitation: Invitation): boolean {
  return new Date(invitation.expires_at).getTime() < Date.now();
}

function InvitationListInner({ invitations }: { invitations: Invitation[] }) {
  const { getInitial, setParam } = useUrlFilterState();
  const [query, setQuery] = useState(() => getInitial("q"));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [onlyUnsent, setOnlyUnsent] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  function handleQueryChange(value: string) {
    setQuery(value);
    setParam("q", value);
  }

  const visible = useMemo(
    () =>
      invitations.filter((i) => {
        if (onlyUnsent && i.last_sent_at) return false;
        return matchesSearch([i.first_name, i.last_name, i.email], query);
      }),
    [invitations, onlyUnsent, query]
  );
  // Selectie blijft bestaan t.o.v. de volledige lijst (niet alleen het
  // gefilterde deel) zodat wisselen van filter niemand uit de selectie
  // haalt die je net had klaargezet voor een bulkactie.
  const visibleIds = useMemo(() => new Set(visible.map((i) => i.id)), [visible]);
  const selectedVisibleCount = [...selected].filter((id) => visibleIds.has(id)).length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = visible.every((i) => next.has(i.id));
      for (const i of visible) {
        if (allSelected) next.delete(i.id);
        else next.add(i.id);
      }
      return next;
    });
  }

  async function runBulk(action: (ids: string[]) => Promise<{ succeeded: number; failed: number; error?: string }>, verb: string) {
    const ids = [...selected];
    setBulkPending(true);
    setBulkMessage(null);
    const result = await action(ids);
    setBulkPending(false);
    setSelected(new Set());
    setBulkMessage(
      result.error ?? `${verb}: ${result.succeeded} gelukt${result.failed > 0 ? `, ${result.failed} niet` : ""}.`
    );
  }

  if (invitations.length === 0) {
    return <p className="py-6 text-sm text-muted">Er zijn nog geen openstaande uitnodigingen.</p>;
  }

  return (
    <div>
      <ListToolbar
        searchValue={query}
        onSearchChange={handleQueryChange}
        searchPlaceholder="Zoek op naam of e-mailadres…"
        resultCount={visible.length}
        totalCount={invitations.length}
      />

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input type="checkbox" checked={onlyUnsent} onChange={(e) => setOnlyUnsent(e.target.checked)} className="rounded" />
          Alleen nooit verstuurd
        </label>
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">{selected.size} geselecteerd</span>
            <button
              type="button"
              disabled={bulkPending}
              onClick={() => runBulk(bulkSendInvitationEmailsAction, "Verstuurd")}
              className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-black/[.04] disabled:opacity-50 dark:hover:bg-white/[.06]"
            >
              <Mail size={13} />
              Verstuur
            </button>
            <button
              type="button"
              disabled={bulkPending}
              onClick={() => runBulk(bulkExtendInvitationsAction, "Verlengd")}
              className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-black/[.04] disabled:opacity-50 dark:hover:bg-white/[.06]"
            >
              <Clock size={13} />
              Verleng
            </button>
            <button
              type="button"
              disabled={bulkPending}
              onClick={() => runBulk(bulkRevokeInvitationsAction, "Ingetrokken")}
              className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-voc-red-text hover:bg-voc-red-light disabled:opacity-50"
            >
              <X size={13} />
              Intrekken
            </button>
          </div>
        )}
      </div>

      {bulkMessage && <p className="mb-2 text-xs text-muted">{bulkMessage}</p>}

      {visible.length === 0 ? (
        <p className="py-6 text-sm text-muted">Geen uitnodigingen gevonden.</p>
      ) : (
        <div>
          <label className="flex items-center gap-2 border-b border-border py-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={selectedVisibleCount === visible.length}
              onChange={toggleAllVisible}
              className="rounded"
            />
            Alles selecteren
          </label>
          {visible.map((invitation) => (
            <InvitationRow
              key={invitation.id}
              invitation={invitation}
              selected={selected.has(invitation.id)}
              onToggleSelected={() => toggle(invitation.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function InvitationList(props: { invitations: Invitation[] }) {
  return (
    <Suspense>
      <InvitationListInner {...props} />
    </Suspense>
  );
}
