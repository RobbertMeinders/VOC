"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { updateMemberRoleAction, type UpdateMemberRoleState } from "@/app/(app)/leden/[id]/actions";
import type { UserRole } from "@/lib/types/database";

const initialState: UpdateMemberRoleState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-voc-red px-3 py-1.5 text-sm font-medium text-white hover:bg-voc-red-dark disabled:opacity-60"
    >
      {pending ? "Opslaan…" : "Opslaan"}
    </button>
  );
}

export function RoleEditor({ memberId, currentRole }: { memberId: string; currentRole: UserRole }) {
  const updateWithId = updateMemberRoleAction.bind(null, memberId);
  const [state, formAction] = useActionState(updateWithId, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
      <label htmlFor="role" className="text-xs font-medium text-muted">
        Rol wijzigen (alleen zichtbaar voor beheerders)
      </label>
      <div className="flex items-center gap-2">
        <select
          id="role"
          name="role"
          defaultValue={currentRole}
          className="h-9 flex-1 rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
        >
          {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
        <SubmitButton />
      </div>
      {state.error && (
        <p role="alert" className="text-xs text-voc-red">
          {state.error}
        </p>
      )}
      {state.success && <p className="text-xs text-green-600">Rol bijgewerkt.</p>}
    </form>
  );
}
