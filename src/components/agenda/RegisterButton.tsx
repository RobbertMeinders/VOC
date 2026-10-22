"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { registerForActivityAction, unregisterFromActivityAction } from "@/app/(app)/agenda/actions";

export function RegisterButton({
  activityId,
  initialRegistered,
  initialWaitlisted,
  isFull,
  deadlinePassed,
  // Externe activiteiten: de échte aanmelding gebeurt op de site van de
  // organisator (zie de link ernaast in ActivityDetailContent) — deze knop
  // registreert dan geen "aanmelding" maar laat een lid alleen aangeven erbij
  // te zijn, zodat andere leden dat in "Wie gaat er ook" kunnen zien.
  // Hergebruikt bewust dezelfde activity_registrations-rij/knop i.p.v. een
  // apart mechanisme — alleen de tekst verandert.
  externalEvent = false,
}: {
  activityId: string;
  initialRegistered: boolean;
  initialWaitlisted: boolean;
  isFull: boolean;
  deadlinePassed: boolean;
  externalEvent?: boolean;
}) {
  const [registered, setRegistered] = useState(initialRegistered);
  const [waitlisted, setWaitlisted] = useState(initialWaitlisted);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      if (registered) {
        const result = await unregisterFromActivityAction(activityId);
        if (result?.error) {
          setError(result.error);
        } else {
          setRegistered(false);
          setWaitlisted(false);
          // De deelnemerslijst ("Wie gaat er ook") en de aanmeldteller
          // elders op deze pagina zijn server-gerenderd — zonder refresh
          // bleven die staan op de stand van vóór deze af-/aanmelding tot
          // een handmatige paginaherlading.
          router.refresh();
        }
        return;
      }

      const result = await registerForActivityAction(activityId);
      if (result?.error) {
        setError(result.error);
      } else {
        setRegistered(true);
        setWaitlisted(Boolean(result.waitlisted));
        router.refresh();
      }
    });
  }

  if (!registered && deadlinePassed) {
    return (
      <Button disabled variant="secondary">
        Aanmelden is gesloten
      </Button>
    );
  }

  // Robberts feedback: "Afmelden" stond als hoofdknop zodra je al was
  // aangemeld — dat las in één oogopslag niet als status, en een
  // onoplettende tik daarop meldde je meteen af. De status zelf is nu
  // geen knop meer, alleen een kleine, duidelijk minder opvallende link
  // eronder meldt je nog af.
  if (registered) {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <div
          className={clsx(
            "flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium",
            waitlisted ? "bg-status-warning-soft text-status-warning" : "bg-status-success-soft text-status-success"
          )}
        >
          {waitlisted ? <Clock size={15} /> : <CheckCircle2 size={15} />}
          {waitlisted ? "Je staat op de wachtlijst" : "Je bent aangemeld"}
        </div>
        {waitlisted && <p className="text-xs text-muted">Je krijgt bericht zodra er een plek vrijkomt.</p>}
        <button
          type="button"
          onClick={handleClick}
          disabled={pending}
          className="text-xs font-medium text-muted underline-offset-2 hover:text-foreground hover:underline disabled:opacity-60"
        >
          {pending ? "Bezig…" : waitlisted ? "Wachtlijst verlaten" : externalEvent ? "Niet meer aanwezig" : "Afmelden"}
        </button>
        {error && (
          <p role="alert" className="text-sm text-danger-text">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleClick} disabled={pending} variant={externalEvent ? "secondary" : "primary"}>
        {pending ? "Bezig…" : isFull ? "Op de wachtlijst" : externalEvent ? "Ik ben hierbij aanwezig" : "Aanmelden"}
      </Button>
      {isFull && <p className="text-xs text-muted">Deze activiteit is vol, maar je kunt je op de wachtlijst zetten.</p>}
      {error && (
        <p role="alert" className="text-sm text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}
