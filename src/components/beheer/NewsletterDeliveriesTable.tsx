import { CheckCircle2, XCircle, MinusCircle, Clock } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { Card } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/format/date";
import type { Database } from "@/lib/types/database";

type Delivery = Database["public"]["Tables"]["communication_deliveries"]["Row"];
type SendAttempt = Database["public"]["Tables"]["communication_send_attempts"]["Row"];

const ATTEMPT_LABELS: Record<SendAttempt["kind"], string> = {
  eerste_verzending: "Eerste verzending",
  nasturen: "Nasturen",
  opnieuw_proberen: "Opnieuw proberen",
};

function DeliveryStatus({ delivery }: { delivery: Delivery }) {
  if (delivery.status === "verstuurd") {
    return (
      <StatusPill tone="success" icon={CheckCircle2}>
        Verstuurd
      </StatusPill>
    );
  }
  if (delivery.status === "mislukt") {
    return (
      <StatusPill tone="danger" icon={XCircle}>
        Mislukt{delivery.failure_reason ? ` - ${delivery.failure_reason}` : ""}
      </StatusPill>
    );
  }
  if (delivery.status === "overgeslagen") {
    return (
      <StatusPill tone="neutral" icon={MinusCircle}>
        Overgeslagen{delivery.failure_reason ? ` - ${delivery.failure_reason}` : ""}
      </StatusPill>
    );
  }
  return (
    <StatusPill tone="warning" icon={Clock}>
      Wachten
    </StatusPill>
  );
}

// Verzendingen-tab (B1, nieuwsbriefsysteem-plan): per poging wie/wanneer, en
// per ontvanger (lid of contact, door elkaar — zie communication_deliveries,
// 0116) het resultaat met foutreden. recipientNames/attemptStarterNames
// komen als losse name-maps binnen i.p.v. een database-join, zelfde aanpak
// als elders in dit scherm (bv. ListCard in ContactenContent).
export function NewsletterDeliveriesTable({
  deliveries,
  attempts,
  recipientNames,
  attemptStarterNames,
}: {
  deliveries: Delivery[];
  attempts: SendAttempt[];
  recipientNames: Record<string, string>;
  attemptStarterNames: Record<string, string>;
}) {
  if (deliveries.length === 0 && attempts.length === 0) {
    return <p className="text-sm text-muted">Nog geen verzendpoging geweest.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {attempts.length > 0 && (
        <div className="rounded-2xl bg-surface p-5 shadow-sm">
          <p className="mb-3 text-sm font-medium text-foreground">Pogingen</p>
          <div className="flex flex-col gap-2">
            {attempts.map((attempt) => (
              <div key={attempt.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 text-sm last:border-0 last:pb-0">
                <span className="text-foreground">{ATTEMPT_LABELS[attempt.kind] ?? attempt.kind}</span>
                <span className="text-muted">
                  {attempt.started_by ? attemptStarterNames[attempt.started_by] ?? "Onbekend lid" : "Automatisch (ingepland)"} ·{" "}
                  {formatDateTime(attempt.started_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card padded={false} className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="px-4 py-2 font-medium">Ontvanger</th>
              <th className="px-4 py-2 font-medium">E-mailadres</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Verstuurd op</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((delivery) => {
              const recipientId = delivery.profile_id ?? delivery.contact_id;
              const name = recipientId ? (recipientNames[recipientId] ?? "Onbekend") : "Onbekend";
              return (
                <tr key={delivery.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-foreground">
                    {name}
                    <span className="ml-1.5 text-xs text-muted">{delivery.profile_id ? "(lid)" : "(contact)"}</span>
                  </td>
                  <td className="px-4 py-2 text-muted">{delivery.email}</td>
                  <td className="px-4 py-2">
                    <DeliveryStatus delivery={delivery} />
                  </td>
                  <td className="px-4 py-2 text-muted">{delivery.sent_at ? formatDateTime(delivery.sent_at) : "-"}</td>
                </tr>
              );
            })}
            {deliveries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted">
                  Nog geen ontvangers geclaimd.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
