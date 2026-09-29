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

  if (allowPublicRegistration) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2">
          <PopupLoginLink
            href={loginHref}
            className="inline-block w-fit rounded-full bg-voc-red px-4 py-2 text-sm font-medium text-white hover:bg-voc-red/90"
          >
            Log in om je aan te melden
          </PopupLoginLink>
          {unlockPrompt}
          {denied && <p className="text-xs text-muted">Kon geen toegang krijgen — gebruik de knop hierboven.</p>}
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-6">
          <p className="text-sm text-foreground">Meld je aan als bezoeker</p>
          <PublicRegistrationForm activityId={activityId} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="text-sm text-muted">Deze activiteit is alleen voor leden.</p>
      <PopupLoginLink
        href={loginHref}
        className="inline-block w-fit rounded-full bg-voc-red px-4 py-2 text-sm font-medium text-white hover:bg-voc-red/90"
      >
        Log in om je aan te melden
      </PopupLoginLink>
      {unlockPrompt}
      {denied && <p className="text-xs text-muted">Kon geen toegang krijgen — gebruik de knop hierboven.</p>}
    </div>
  );
}
