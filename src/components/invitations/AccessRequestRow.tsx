"use client";

import { Check } from "lucide-react";
import type { Database } from "@/lib/types/database";
import { markAccessRequestHandledAction } from "@/app/(app)/beheer/aanvragen/actions";

export type AccessRequest = Database["public"]["Tables"]["access_requests"]["Row"];

export function AccessRequestRow({ request }: { request: AccessRequest }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border py-3 last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">
          {request.name}
          {request.job_title && <span className="font-normal text-muted"> — {request.job_title}</span>}
        </p>
        <p className="text-xs text-muted">
          <a href={`mailto:${request.email}`} className="hover:underline">
            {request.email}
          </a>
          {request.phone && ` · ${request.phone}`}
          {request.company_name && ` · ${request.company_name}`}
          {" · "}
          {new Date(request.created_at).toLocaleDateString("nl-NL")}
        </p>
        {request.message && <p className="mt-1 text-sm text-foreground">{request.message}</p>}
      </div>
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
  );
}
