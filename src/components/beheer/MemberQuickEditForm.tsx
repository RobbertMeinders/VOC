"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { quickUpdateMemberAction, type QuickUpdateMemberState } from "@/app/(app)/leden/[id]/actions";
import { useToast } from "@/lib/ui/ToastContext";

const initialState: QuickUpdateMemberState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-voc-red px-3.5 py-1.5 text-xs font-medium text-white hover:bg-voc-red-dark disabled:opacity-60"
    >
      {pending ? "Opslaan…" : "Opslaan"}
    </button>
  );
}

// Inline formulier in Beheer -> Leden: alleen naam/functie/telefoon, de
// velden die in de rij zelf al zichtbaar zijn — e-mail, bio, socials, rol en
// activeren/deactiveren blijven op het volledige profiel (link onderaan dit
// paneel) resp. het bestaande rijmenu.
export function MemberQuickEditForm({
  memberId,
  firstName,
  lastName,
  jobTitle,
  phone,
  onSaved,
}: {
  memberId: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  phone: string | null;
  onSaved: () => void;
}) {
  const updateWithId = quickUpdateMemberAction.bind(null, memberId);
  const [state, formAction] = useActionState(updateWithId, initialState);
  const toast = useToast();

  useEffect(() => {
    if (state.success) {
      toast("Opgeslagen.");
      onSaved();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`qe-first-${memberId}`} className="text-xs font-medium text-foreground">
            Voornaam
          </label>
          <Input id={`qe-first-${memberId}`} name="first_name" defaultValue={firstName} required className="h-9" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`qe-last-${memberId}`} className="text-xs font-medium text-foreground">
            Achternaam
          </label>
          <Input id={`qe-last-${memberId}`} name="last_name" defaultValue={lastName} required className="h-9" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`qe-job-${memberId}`} className="text-xs font-medium text-foreground">
            Functie
          </label>
          <Input id={`qe-job-${memberId}`} name="job_title" defaultValue={jobTitle ?? ""} className="h-9" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`qe-phone-${memberId}`} className="text-xs font-medium text-foreground">
            Telefoon
          </label>
          <Input id={`qe-phone-${memberId}`} name="phone" type="tel" defaultValue={phone ?? ""} className="h-9" />
        </div>
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-voc-red-light px-3 py-2 text-xs text-voc-red-text">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link href={`/leden/${memberId}`} className="text-xs font-medium text-voc-red-text hover:underline">
          Meer bewerken
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}
