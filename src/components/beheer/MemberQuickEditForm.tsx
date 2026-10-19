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

// Inline formulier in Beheer -> Leden: alleen naam/telefoon. Functie stond
// er eerder ook bij, maar is in de praktijk zelden iets dat je hier snel
// hoeft te wijzigen — e-mail staat er bewust niet bij: dat is het
// inlog-adres en loopt via een eigen, geverifieerde wijzig-flow, niet via
// een los formulierveld dat zomaar iemands account zou kunnen loskoppelen.
// Bio, socials, functie, rol en activeren/deactiveren blijven op het
// volledige profiel (link onderaan dit paneel) resp. het rijmenu.
export function MemberQuickEditForm({
  memberId,
  firstName,
  lastName,
  phone,
  boardTitle,
  onSaved,
}: {
  memberId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  boardTitle: string | null;
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
          <label htmlFor={`qe-phone-${memberId}`} className="text-xs font-medium text-foreground">
            Telefoon
          </label>
          <Input id={`qe-phone-${memberId}`} name="phone" type="tel" defaultValue={phone ?? ""} className="h-9" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`qe-board-${memberId}`} className="text-xs font-medium text-foreground">
          Bestuursfunctie
        </label>
        <Input
          id={`qe-board-${memberId}`}
          name="board_title"
          defaultValue={boardTitle ?? ""}
          placeholder="Bijv. Voorzitter of Penningmeester. Leeg laten als iemand geen bestuursfunctie heeft."
          className="h-9"
        />
        <p className="text-xs text-muted">Verschijnt op de Bestuur-pagina. Verandert niets aan de systeemrol van dit lid.</p>
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
