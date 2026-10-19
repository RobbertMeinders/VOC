"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ChevronDown, Pencil, Plus, UserPlus, Users, X } from "lucide-react";
import { clsx } from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DeleteButton } from "@/components/feed/DeleteButton";
import { ComingSoon } from "@/components/ui/ComingSoon";
import {
  addCommissionMemberAction,
  archiveCommissionAction,
  createCommissionAction,
  decideCommissionApplicationAction,
  deleteCommissionAction,
  removeCommissionMemberAction,
  unarchiveCommissionAction,
  updateCommissionAction,
  type AddCommissionMemberState,
  type CreateCommissionState,
} from "@/app/(app)/beheer/vereniging/commissies/actions";
import { useToast } from "@/lib/ui/ToastContext";

export type CommissionAdminRow = {
  id: string;
  name: string;
  description: string | null;
  archivedAt: string | null;
  members: { profileId: string; firstName: string; lastName: string; avatarUrl: string | null }[];
  applications: { id: string; profileId: string; firstName: string; lastName: string; avatarUrl: string | null; createdAt: string }[];
};
export type MemberOption = { id: string; name: string };

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

const newCommissionInitialState: CreateCommissionState = {};

function NewCommissionForm({ onCreated }: { onCreated: () => void }) {
  const [state, formAction] = useActionState(createCommissionAction, newCommissionInitialState);
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (state.success) {
      toast("Commissie aangemaakt.");
      formRef.current?.reset();
      onCreated();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">Nieuwe commissie</h2>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="new-commission-name" className="text-xs font-medium text-foreground">
            Naam
          </label>
          <Input id="new-commission-name" name="name" required className="h-9" placeholder="Bijv. Evenementencommissie" />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="new-commission-description" className="text-xs font-medium text-foreground">
            Omschrijving (optioneel)
          </label>
          <Input id="new-commission-description" name="description" className="h-9" placeholder="Korte toelichting" />
        </div>
        <SubmitButton label="Aanmaken" pendingLabel="Aanmaken…" />
      </div>
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-voc-red-text">
          {state.error}
        </p>
      )}
    </form>
  );
}

const addMemberInitialState: AddCommissionMemberState = {};

function CommissionCard({ commission, memberOptions }: { commission: CommissionAdminRow; memberOptions: MemberOption[] }) {
  // Standaard uitgeklapt zodra er aanmeldingen in behandeling zijn — anders
  // was een aanmelding wel zichtbaar als badge, maar makkelijk te missen
  // tussen de andere commissies door, zonder zelf op het pijltje te klikken.
  const [expanded, setExpanded] = useState(commission.applications.length > 0);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  // Direct aanroepen i.p.v. useActionState: het sluiten van het
  // bewerk-formulier bij succes is state die bij een gebruikersactie hoort,
  // niet iets om in een effect op een afgeleide state-wijziging te reageren.
  function handleEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateCommissionAction(commission.id, {}, formData);
      if (result.error) {
        setEditError(result.error);
        return;
      }
      setEditError(null);
      setEditing(false);
      toast("Opgeslagen.");
      router.refresh();
    });
  }

  const addMemberWithId = addCommissionMemberAction.bind(null, commission.id);
  const [addMemberState, addMemberAction] = useActionState(addMemberWithId, addMemberInitialState);
  const addMemberFormRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (addMemberState.success) addMemberFormRef.current?.reset();
  }, [addMemberState]);

  const memberIds = new Set(commission.members.map((m) => m.profileId));
  const availableOptions = memberOptions.filter((o) => !memberIds.has(o.id));

  function handleRemoveMember(profileId: string) {
    startTransition(async () => {
      await removeCommissionMemberAction(commission.id, profileId);
      router.refresh();
    });
  }

  function handleDecide(applicationId: string, approve: boolean) {
    startTransition(async () => {
      await decideCommissionApplicationAction(applicationId, approve);
      router.refresh();
    });
  }

  function handleArchiveToggle() {
    startTransition(async () => {
      if (commission.archivedAt) await unarchiveCommissionAction(commission.id);
      else await archiveCommissionAction(commission.id);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{commission.name}</p>
            {commission.archivedAt && (
              <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-xs text-muted dark:bg-white/10">Gearchiveerd</span>
            )}
            {commission.applications.length > 0 && (
              <span className="shrink-0 rounded-full bg-voc-red-light px-2 py-0.5 text-xs font-medium text-voc-red-text">
                {commission.applications.length} aanmelding{commission.applications.length > 1 ? "en" : ""}
              </span>
            )}
          </div>
          {commission.description && <p className="mt-0.5 truncate text-xs text-muted">{commission.description}</p>}
          <p className="mt-1 text-xs text-muted">
            {commission.members.length} lid{commission.members.length === 1 ? "" : "en"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            aria-label="Bewerken"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:border-muted hover:text-foreground"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={handleArchiveToggle}
            disabled={isPending}
            aria-label={commission.archivedAt ? "Herstellen" : "Archiveren"}
            title={commission.archivedAt ? "Herstellen" : "Archiveren"}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:border-muted hover:text-foreground disabled:opacity-50"
          >
            {commission.archivedAt ? <ArchiveRestore size={13} /> : <Archive size={13} />}
          </button>
          {commission.archivedAt && (
            <DeleteButton
              onDelete={() => deleteCommissionAction(commission.id)}
              confirmMessage={`Weet je zeker dat je ${commission.name} definitief wilt verwijderen? Dit verwijdert ook de ledenlijst en aanmeldingen van deze commissie.`}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-voc-red-text hover:border-muted"
              size={13}
            />
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Inklappen" : "Leden en aanmeldingen beheren"}
            className={clsx(
              "flex h-8 w-8 items-center justify-center rounded-full border text-foreground hover:border-muted hover:text-foreground",
              expanded ? "border-foreground/20 bg-raised text-foreground" : "border-border bg-surface"
            )}
          >
            <ChevronDown size={14} className={clsx("transition-transform", expanded && "rotate-180")} />
          </button>
        </div>
      </div>

      {editing && (
        <form onSubmit={handleEditSubmit} className="mt-3 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">Naam</label>
            <Input name="name" defaultValue={commission.name} required className="h-9" />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">Omschrijving</label>
            <Input name="description" defaultValue={commission.description ?? ""} className="h-9" />
          </div>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Opslaan…" : "Opslaan"}
          </Button>
          {editError && <p className="text-sm text-voc-red-text">{editError}</p>}
        </form>
      )}

      {expanded && (
        <div className="mt-3 flex flex-col gap-4 border-t border-border pt-3">
          {commission.applications.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Aanmeldingen in behandeling</p>
              <div className="flex flex-col gap-1.5">
                {commission.applications.map((application) => (
                  <div key={application.id} className="flex items-center gap-2 rounded-xl border border-border p-2">
                    <Avatar firstName={application.firstName} lastName={application.lastName} avatarUrl={application.avatarUrl} size={28} />
                    <p className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {application.firstName} {application.lastName}
                    </p>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDecide(application.id, true)}
                      className="rounded-full bg-status-success px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      Goedkeuren
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDecide(application.id, false)}
                      className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted hover:text-foreground disabled:opacity-50"
                    >
                      Afwijzen
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Leden</p>
            {commission.members.length === 0 ? (
              <p className="text-sm text-muted">Nog geen leden.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {commission.members.map((member) => (
                  <div key={member.profileId} className="flex items-center gap-2 rounded-xl border border-border p-2">
                    <Avatar firstName={member.firstName} lastName={member.lastName} avatarUrl={member.avatarUrl} size={28} />
                    <p className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {member.firstName} {member.lastName}
                    </p>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRemoveMember(member.profileId)}
                      aria-label="Verwijderen uit commissie"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:text-foreground disabled:opacity-50"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {availableOptions.length > 0 && (
              <form ref={addMemberFormRef} action={addMemberAction} className="mt-2 flex items-center gap-2">
                <Select name="profile_id" required defaultValue="" className="h-9 flex-1 pl-3">
                  <option value="" disabled>
                    Lid toevoegen…
                  </option>
                  {availableOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </Select>
                <Button type="submit" size="sm" variant="secondary">
                  <UserPlus size={14} />
                </Button>
              </form>
            )}
            {addMemberState.error && <p className="mt-1 text-xs text-voc-red-text">{addMemberState.error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export function CommissiesAdminContent({ commissions, memberOptions }: { commissions: CommissionAdminRow[]; memberOptions: MemberOption[] }) {
  // Achter een knop i.p.v. altijd zichtbaar: een commissie aanmaken gebeurt
  // zelden, dus hoeft dit formulier niet standaard in beeld te staan.
  const [showNewForm, setShowNewForm] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {showNewForm ? (
        <NewCommissionForm onCreated={() => setShowNewForm(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setShowNewForm(true)}
          className="flex items-center justify-center gap-1.5 self-start rounded-full border border-border bg-surface px-3.5 py-2 text-sm font-medium text-foreground hover:border-muted hover:text-foreground"
        >
          <Plus size={15} />
          Nieuwe commissie
        </button>
      )}

      {commissions.length === 0 ? (
        <ComingSoon icon={Users} title="Nog geen commissies" description="Maak hierboven de eerste commissie aan." />
      ) : (
        <div className="flex flex-col gap-3">
          {commissions.map((commission) => (
            <CommissionCard key={commission.id} commission={commission} memberOptions={memberOptions} />
          ))}
        </div>
      )}
    </div>
  );
}
