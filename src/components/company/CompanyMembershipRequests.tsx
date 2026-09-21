"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { decideCompanyMembershipRequestAction } from "@/app/(app)/bedrijven/[id]/actions";

export type PendingMembershipRequest = {
  id: string;
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    avatarUrl: string | null;
  };
};

export function CompanyMembershipRequests({
  companyId,
  requests,
}: {
  companyId: string;
  requests: PendingMembershipRequest[];
}) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visible = requests.filter((r) => !dismissed.includes(r.id));
  if (visible.length === 0) return null;

  function decide(requestId: string, decision: "approved" | "rejected") {
    setError(null);
    startTransition(async () => {
      const result = await decideCompanyMembershipRequestAction(requestId, companyId, decision);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDismissed((d) => [...d, requestId]);
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-foreground">Openstaande koppelingsaanvragen</h2>
      <p className="mb-4 text-xs text-muted">
        Alleen zichtbaar voor bestaande collega&apos;s bij dit bedrijf en bestuur/beheer.
      </p>
      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red">
          {error}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {visible.map((request) => (
          <li key={request.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar
                firstName={request.profile.first_name}
                lastName={request.profile.last_name}
                avatarUrl={request.profile.avatarUrl}
                size={32}
              />
              <span className="truncate text-sm text-foreground">
                {request.profile.first_name} {request.profile.last_name}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => decide(request.id, "approved")}
                aria-label="Goedkeuren"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-voc-red-light text-voc-red hover:bg-voc-red hover:text-white disabled:opacity-50"
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => decide(request.id, "rejected")}
                aria-label="Afwijzen"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[.04] text-muted hover:bg-black/[.08] disabled:opacity-50 dark:bg-white/[.06] dark:hover:bg-white/[.1]"
              >
                <X size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
