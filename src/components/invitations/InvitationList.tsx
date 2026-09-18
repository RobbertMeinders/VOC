import type { Database } from "@/lib/types/database";
import { InvitationRow } from "./InvitationRow";

export type Invitation = Database["public"]["Tables"]["invitations"]["Row"];

export function InvitationList({ invitations }: { invitations: Invitation[] }) {
  if (invitations.length === 0) {
    return <p className="py-6 text-sm text-muted">Er zijn nog geen openstaande uitnodigingen.</p>;
  }

  return (
    <div>
      {invitations.map((invitation) => (
        <InvitationRow key={invitation.id} invitation={invitation} />
      ))}
    </div>
  );
}
