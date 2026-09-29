import { formatLastActive } from "@/lib/format/date";
import { ProspectStatusSelect } from "./ProspectStatusSelect";
import type { Database } from "@/lib/types/database";

export type Prospect = Database["public"]["Tables"]["prospects"]["Row"];

export function ProspectRow({ prospect }: { prospect: Prospect }) {
  return (
    <div className="flex flex-col gap-3 border-b border-border py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{prospect.name}</p>
        <p className="truncate text-xs text-muted">
          {prospect.email}
          {prospect.company_name && ` · ${prospect.company_name}`}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          Voor het eerst gezien: {formatLastActive(prospect.first_seen_at)} · Laatst aangemeld:{" "}
          {formatLastActive(prospect.last_seen_at)}
        </p>
      </div>
      <div className="shrink-0">
        <ProspectStatusSelect prospectId={prospect.id} initialStatus={prospect.status} />
      </div>
    </div>
  );
}
