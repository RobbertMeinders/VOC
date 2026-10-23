"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { createInvitationAction, type CreateInvitationState } from "@/app/(app)/beheer/uitnodigingen/actions";
import { useToast } from "@/lib/ui/ToastContext";

const initialState: CreateInvitationState = {};

// Personenmodel Fase 2: bestuurs-koppelactie voor een "geen lid"-aanmelding
// via de website ("Aangemeld via de website" op een activiteit) -- één
// klik hergebruikt de bestaande createInvitationAction met naam/e-mailadres
// voorgevuld. Bewust GEEN bedrijf meesturen: companyName is zelf-ingetypt
// en onbevestigd (zelfde principe als get_people_directory, 0208) -- het
// bestuur koppelt het bedrijf zelf, later, als dat klopt.
export function QuickInviteButton({ name, email }: { name: string; email: string }) {
  const [state, formAction] = useActionState(createInvitationAction, initialState);
  const toast = useToast();

  useEffect(() => {
    if (state.success) {
      toast(state.emailSent === false ? "Uitnodiging aangemaakt, maar versturen is niet gelukt." : "Uitnodiging verstuurd.");
    } else if (state.error) {
      toast(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // useActionState bewaart de laatste state tot een volgende submit -- na
  // succes verschijnt deze knop niet opnieuw (hij wordt hieronder vervangen
  // door platte tekst), dus state.success is hier zelf al de "verstuurd"-
  // vlag, zonder losse lokale state nodig te hebben.
  if (state.success) {
    return <span className="text-xs text-muted">Uitgenodigd</span>;
  }

  const [firstName, ...rest] = name.trim().split(/\s+/);
  const lastName = rest.join(" ");

  return (
    <form action={formAction}>
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="first_name" value={firstName ?? ""} />
      <input type="hidden" name="last_name" value={lastName} />
      <input type="hidden" name="role" value="lid" />
      <input type="hidden" name="source" value="nieuw_lid" />
      <button
        type="submit"
        className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:border-muted"
      >
        <UserPlus size={13} />
        Uitnodigen als lid
      </button>
    </form>
  );
}
