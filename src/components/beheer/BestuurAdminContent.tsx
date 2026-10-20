"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, UserCheck, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ComingSoon } from "@/components/ui/ComingSoon";
import {
  addBoardMemberAction,
  removeBoardPositionAction,
  setBoardPositionAction,
  type BoardPositionState,
} from "@/app/(app)/beheer/vereniging/bestuur-actions";
import { useToast } from "@/lib/ui/ToastContext";

export type BoardMemberRow = {
  profileId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  companyName: string | null;
  title: string;
};
export type MemberOption = { id: string; name: string };

const addInitialState: BoardPositionState = {};

function AddBoardMemberForm({ memberOptions }: { memberOptions: MemberOption[] }) {
  const [state, formAction] = useActionState(addBoardMemberAction, addInitialState);
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (state.success) {
      toast("Bestuurslid toegevoegd.");
      formRef.current?.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (memberOptions.length === 0) return null;

  return (
    <form ref={formRef} action={formAction} className="rounded-2xl bg-surface p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">Bestuurslid toevoegen</h2>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="new-board-member" className="text-xs font-medium text-foreground">
            Lid
          </label>
          <Select id="new-board-member" name="profile_id" required defaultValue="" className="h-9 pl-3">
            <option value="" disabled>
              Kies een lid…
            </option>
            {memberOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="new-board-title" className="text-xs font-medium text-foreground">
            Functie
          </label>
          <Input id="new-board-title" name="title" required className="h-9" placeholder="Bijv. Voorzitter" />
        </div>
        <Button type="submit" size="sm">
          Toevoegen
        </Button>
      </div>
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-voc-red-text">
          {state.error}
        </p>
      )}
    </form>
  );
}

function BoardMemberRowItem({ member }: { member: BoardMemberRow }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  // Direct aanroepen i.p.v. useActionState — zelfde reden als
  // CommissiesAdminContent's CommissionCard: setEditing(false) bij succes
  // hoort bij de gebruikersactie zelf, niet in een effect op afgeleide state.
  function handleEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await setBoardPositionAction(member.profileId, {}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setEditing(false);
      toast("Opgeslagen.");
      router.refresh();
    });
  }

  function handleRemove() {
    if (!window.confirm(`${member.firstName} ${member.lastName} als bestuurslid verwijderen?`)) return;
    startTransition(async () => {
      await removeBoardPositionAction(member.profileId);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center gap-3">
        <Avatar firstName={member.firstName} lastName={member.lastName} avatarUrl={member.avatarUrl} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {member.firstName} {member.lastName}
          </p>
          {!editing && (
            <p className="truncate text-xs text-voc-red-text">
              {member.title}
              {member.companyName && <span className="text-muted"> · {member.companyName}</span>}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            aria-label="Functie bewerken"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:border-muted hover:text-foreground"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            aria-label="Verwijderen uit bestuur"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-voc-red-text hover:border-muted disabled:opacity-50"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      {editing && (
        <form onSubmit={handleEditSubmit} className="mt-3 flex items-end gap-2 border-t border-border pt-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">Functie</label>
            <Input name="title" defaultValue={member.title} required className="h-9" />
          </div>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Opslaan…" : "Opslaan"}
          </Button>
        </form>
      )}
      {error && <p className="mt-1.5 text-xs text-voc-red-text">{error}</p>}
    </div>
  );
}

export function BestuurAdminContent({
  boardMembers,
  memberOptions,
}: {
  boardMembers: BoardMemberRow[];
  memberOptions: MemberOption[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <AddBoardMemberForm memberOptions={memberOptions} />

      {boardMembers.length === 0 ? (
        <ComingSoon icon={UserCheck} title="Nog geen bestuur toegewezen" description="Voeg hierboven het eerste bestuurslid toe." />
      ) : (
        <div className="flex flex-col gap-2">
          {boardMembers.map((member) => (
            <BoardMemberRowItem key={member.profileId} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}
