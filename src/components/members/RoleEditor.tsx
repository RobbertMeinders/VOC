"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { updateMemberRoleAction, type UpdateMemberRoleState } from "@/app/(app)/leden/[id]/actions";
import type { UserRole } from "@/lib/types/database";

const initialState: UpdateMemberRoleState = {};

// UX-review V1: op een ledenrij staan rol wijzigen, deactiveren en het
// organisatieaccount-toggle naast elkaar — met z'n drieën allemaal een rood
// gevuld/omlijnd knopje concurreren ze om aandacht die geen van drieën
// verdient. Secondary (outline) houdt rood gereserveerd voor de knop in de
// bevestigingsdialoog bij echt destructieve acties.
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" size="sm" disabled={pending}>
      {pending ? "Opslaan…" : "Opslaan"}
    </Button>
  );
}

// compact: zonder label/kader — voor dichte overzichten (Beheer > Leden) waar
// elke rij al een duidelijke naam/avatar heeft en de losse omkadering per
// veld anders onnodig veel hoogte kost. Op het individuele ledenprofiel
// (MemberProfileContent) blijft de uitgebreide vorm staan, waar die context
// ontbreekt.
export function RoleEditor({
  memberId,
  currentRole,
  compact = false,
}: {
  memberId: string;
  currentRole: UserRole;
  compact?: boolean;
}) {
  const updateWithId = updateMemberRoleAction.bind(null, memberId);
  const [state, formAction] = useActionState(updateWithId, initialState);

  return (
    <form
      action={formAction}
      className={compact ? "flex flex-col gap-1" : "flex flex-col gap-2 rounded-lg border border-border bg-background p-3"}
    >
      {!compact && (
        <label htmlFor="role" className="text-xs font-medium text-muted">
          Rol wijzigen (alleen zichtbaar voor beheerders)
        </label>
      )}
      <div className="flex items-center gap-2">
        <Select id="role" name="role" defaultValue={currentRole} aria-label="Rol wijzigen" className="h-9 flex-1 pl-2">
          {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </Select>
        <SubmitButton />
      </div>
      {state.error && (
        <p role="alert" className="text-xs text-voc-red-text">
          {state.error}
        </p>
      )}
      {state.success && <p className="text-xs text-green-600">Rol bijgewerkt.</p>}
    </form>
  );
}
