"use client";

import { useEffect, useState } from "react";
import { PublicRegistrationForm } from "@/components/embed/PublicRegistrationForm";
import { PopupLoginLink } from "@/components/embed/PopupLoginLink";
import { RegisterButton } from "@/components/agenda/RegisterButton";

type StatusResponse =
  | { profile: null }
  | {
      profile: { firstName: string };
      registration: { is_waitlisted: boolean } | null;
      isFull: boolean;
      deadlinePassed: boolean;
    };

type DocumentWithStorageAccess = Document & {
  hasStorageAccess?: () => Promise<boolean>;
  requestStorageAccess?: () => Promise<void>;
};

// De Storage Access API is de enige uitzondering op de regel dat dit
// iframe nooit de portaalsessiecookie meekrijgt (zie PopupLoginLink voor de
// volledige uitleg): na een klik van de bezoeker kan de browser alsnog
// toegang geven, áls die bezoeker al eens rechtstreeks (niet in een
// iframe) op het portaal is geweest. Vereist dus altijd een klik — nooit
// volledig stil/automatisch bij het laden van de pagina — en wordt niet in
// elke browser ondersteund. Bewust een progressive enhancement bóvenop de
// altijd-werkende pop-up (PopupLoginLink), nooit een vervanging ervan: als
// de klik niets oplevert (niet ondersteund, geweigerd, of gewoon geen
// sessie), blijft de pop-up-knop gewoon zichtbaar.
export function MemberOrVisitorRegistration({
  activityId,
  allowPublicRegistration,
  loginHref,
}: {
  activityId: string;
  allowPublicRegistration: boolean;
  loginHref: string;
}) {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [denied, setDenied] = useState(false);
  // Lazy initializer i.p.v. een effect: loopt sowieso maar één keer per mount
  // en voorkomt zo een onnodige extra render t.o.v. setState in een effect.
  const [supported] = useState(
    () => typeof document !== "undefined" && Boolean((document as DocumentWithStorageAccess).hasStorageAccess) && Boolean((document as DocumentWithStorageAccess).requestStorageAccess)
  );

  async function fetchStatus() {
    try {
      const res = await fetch(`/api/embed/agenda/${activityId}/status`, { cache: "no-store" });
      const data = (await res.json()) as StatusResponse;
      setStatus(data);
    } catch {
      // netwerkfout: laat de pop-up-fallback gewoon staan
    }
  }

  useEffect(() => {
    if (!supported) return;
    (document as DocumentWithStorageAccess)
      .hasStorageAccess!()
      .then((has) => {
        if (has) fetchStatus();
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  async function unlock() {
    setChecking(true);
    setDenied(false);
    try {
      await (document as DocumentWithStorageAccess).requestStorageAccess!();
      await fetchStatus();
    } catch {
      setDenied(true);
    } finally {
      setChecking(false);
    }
  }

  if (status?.profile) {
    return (
      <div className="flex flex-col gap-3 text-sm text-foreground">
        <p>
          Je bent ingelogd als <span className="font-medium">{status.profile.firstName}</span>.
        </p>
        <RegisterButton
          activityId={activityId}
          initialRegistered={Boolean(status.registration)}
          initialWaitlisted={Boolean(status.registration?.is_waitlisted)}
          isFull={status.isFull}
          deadlinePassed={status.deadlinePassed}
        />
      </div>
    );
  }

  const unlockPrompt = supported && (
    <button
      type="button"
      onClick={unlock}
      disabled={checking}
      className="text-xs text-muted underline decoration-dotted hover:text-foreground disabled:opacity-60"
    >
      {checking ? "Bezig met controleren…" : "Al ingelogd op deze browser? Klik hier"}
    </button>
  );

  // Personenmodel: dit formulier staat vanaf nu ALTIJD onder de inlog-optie,
  // ook als allowPublicRegistration uit staat -- die schakelaar is bedoeld
  // om echte buitenstaanders/gasten te weren, niet om leden tegen te houden
  // die liever niet inloggen. upsert_public_activity_registration (0211)
  // herkent een e-mailadres dat matcht met een bestaand lid zelf en meldt
  // die ECHT aan (met wachtlijst), ongeacht deze schakelaar -- alleen een
  // onbekend e-mailadres wordt nog door allowPublicRegistration tegen-
  // gehouden (met een foutmelding van de RPC zelf). De toelichtingstekst
  // onder het formulier verschilt wel per geval, zodat een activiteit die
  // niet voor echte gasten openstaat dat ook uitstraalt.
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2">
        {!allowPublicRegistration && <p className="text-sm text-muted">Deze activiteit is alleen voor leden.</p>}
        <PopupLoginLink
          href={loginHref}
          className="inline-block w-fit rounded-full bg-voc-red px-4 py-2 text-sm font-medium text-white hover:bg-voc-red/90"
        >
          Log in om je aan te melden
        </PopupLoginLink>
        {unlockPrompt}
        {denied && <p className="text-xs text-muted">Kon geen toegang krijgen - gebruik de knop hierboven.</p>}
      </div>
      <div className="flex flex-col gap-3 border-t border-border pt-6">
        <div>
          <p className="text-sm text-foreground">{allowPublicRegistration ? "Meld je aan als bezoeker" : "Al lid en liever niet inloggen?"}</p>
          {/* Personenmodel: bij een activiteit die open staat voor gasten
              blijft de insteek "meld je aan als bezoeker" (hierboven wijst
              al op inloggen als je lid bent); bij een ledenactiviteit is dit
              formulier er juist alleen voor een lid dat liever geen
              inlogstap doet -- de RPC herkent het ingevulde e-mailadres zelf
              en wijst een onbekend adres dan alsnog af. */}
          <p className="mt-0.5 text-xs text-muted">
            {allowPublicRegistration
              ? "Ben je al lid? Log dan in via de knop hierboven in plaats van dit formulier."
              : "Vul je gegevens in met je bekende e-mailadres -- we herkennen je automatisch en melden je echt aan."}
          </p>
        </div>
        <PublicRegistrationForm activityId={activityId} />
      </div>
    </div>
  );
}
