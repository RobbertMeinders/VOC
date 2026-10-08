"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, UserPlus } from "lucide-react";
import type { Database } from "@/lib/types/database";
import {
  markAccessRequestHandledAction,
  createInvitationFromAccessRequestAction,
  type InviteFromAccessRequestState,
} from "@/app/(app)/beheer/aanvragen/actions";

export type AccessRequest = Database["public"]["Tables"]["access_requests"]["Row"];

const initialInviteState: InviteFromAccessRequestState = {};

function InviteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-1.5 rounded-full bg-voc-red px-3 py-1.5 text-xs font-medium text-white hover:bg-voc-red-dark disabled:opacity-60"
    >
      <UserPlus size={14} />
      {pending ? "Bezig…" : "Uitnodigen"}
    </button>
  );
}

export function AccessRequestRow({ request }: { request: AccessRequest }) {
  // Maakt in één klik een voorgevulde uitnodiging aan (incl. bedrijf, zie
  // createInvitationFromAccessRequestAction) i.p.v. de aanvrager bij het
  // registreren alles — naam, bedrijf, adres — nog een keer te laten
  // intypen. De aanvraag verdwijnt hierna uit deze lijst (niet meer
  // "pending"); de aangemaakte uitnodiging blijft daarna gewoon te volgen/
  // opnieuw te versturen via Beheer -> Uitnodigingen.
  const [inviteState, inviteAction] = useActionState(
    async () => createInvitationFromAccessRequestAction(request.id),
    initialInviteState
  );

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">
          {request.name}
          {request.job_title && <span className="font-normal text-muted"> — {request.job_title}</span>}
        </p>
        <p className="text-xs text-muted">
          <a href={`mailto:${request.email}`} className="break-all hover:underline">
            {request.email}
          </a>
          {request.phone && ` · ${request.phone}`}
          {request.company_name && ` · ${request.company_name}`}
          {" · "}
          {new Date(request.created_at).toLocaleDateString("nl-NL")}
        </p>
        {(request.address || request.postal_code || request.city) && (
          <p className="mt-0.5 text-xs text-muted">
            {[request.address, [request.postal_code, request.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
          </p>
        )}
        {request.website && (
          <p className="mt-0.5 text-xs text-muted">
            <a href={request.website} target="_blank" rel="noreferrer" className="break-all hover:underline">
              {request.website}
            </a>
          </p>
        )}
        {request.message && <p className="mt-1 text-sm text-foreground">{request.message}</p>}
        {inviteState.error && <p className="mt-1.5 text-xs text-voc-red-text">{inviteState.error}</p>}
        {inviteState.success && inviteState.emailSent && (
          <p className="mt-1.5 text-xs text-green-600">Uitnodiging aangemaakt en per e-mail verstuurd.</p>
        )}
        {inviteState.success && !inviteState.emailSent && (
          <p className="mt-1.5 text-xs text-voc-red-text">
            Uitnodiging aangemaakt, maar de e-mail versturen is niet gelukt{inviteState.emailError ? ` (${inviteState.emailError})` : ""}.
            Verstuur &apos;m opnieuw via Uitnodigingen.
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <form action={inviteAction}>
          <InviteButton />
        </form>
        <form action={markAccessRequestHandledAction.bind(null, request.id)}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
          >
            <Check size={14} />
            Afgehandeld
          </button>
        </form>
      </div>
    </div>
  );
}
