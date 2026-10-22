"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/Switch";
import { subscribeToPushAction, unsubscribeFromPushAction } from "@/app/(app)/profiel/actions";
import { getExistingPushSubscription, subscribeToPush } from "@/lib/push/subscribe";

// NEXT_PUBLIC_-variabelen worden op build-tijd ingebakken in de client-
// bundle, dus dit is hier direct uit te lezen — geen los verzoek nodig.
const PUSH_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);

type Platform = "ios" | "android" | "other";

// iOS staat webpush alleen toe als de site vanaf het beginscherm draait
// (Apple-beperking, geen portaal-instelling). Zonder dit blokje leek
// "Pushmeldingen worden niet ondersteund in deze browser." een doodlopend
// eindje, terwijl het na installatie gewoon werkt. navigator.standalone is
// de iOS-specifieke (niet in de standaard DOM-typen aanwezige) tegenhanger
// van de standaard display-mode-media-query.
function isStandalone(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return (navigator as unknown as { standalone?: boolean }).standalone === true;
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

const INSTALL_STEPS: Record<Platform, string> = {
  ios: 'Tik op het deel-icoon onderin en kies "Zet op beginscherm". Open het portaal daarna via dat icoon en zet meldingen aan.',
  android: 'Tik op het menu (drie puntjes) en kies "App installeren" of "Toevoegen aan startscherm". Open daarna via dat icoon en zet meldingen aan.',
  other: "Zet het portaal via het menu van je browser op je startscherm en open het daarna via dat icoon om meldingen aan te zetten.",
};

// Alleen op mobiel relevant (sm:hidden) en alleen zolang het portaal nog
// niet als geinstalleerde app draait: staat het al op het beginscherm, dan
// werkt de schakelaar hierboven gewoon en hoort dit blokje niet in de weg
// te staan. null bij de eerste render (geen window/navigator op de server)
// voorkomt een hydratie-mismatch i.p.v. de hint eerst te laten flashen.
function InstallHint({ platform }: { platform: Platform }) {
  return (
    <p className="text-right text-xs text-muted sm:hidden">
      Meldingen op je telefoon? {INSTALL_STEPS[platform]}
    </p>
  );
}

export function PushToggle() {
  const [subscribed, setSubscribed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileHint, setMobileHint] = useState<Platform | null>(null);

  useEffect(() => {
    if (!PUSH_CONFIGURED) return;
    getExistingPushSubscription().then((sub) => setSubscribed(Boolean(sub)));
    // Zelfde "pas na mount bijwerken"-patroon als hierboven (via een
    // callback i.p.v. rechtstreeks in het effect), anders wijkt de
    // server-render (geen window/navigator daar) af van de eerste
    // client-render, wat een hydratiemismatch zou geven.
    Promise.resolve().then(() => setMobileHint(isStandalone() ? null : detectPlatform()));
  }, []);

  async function handleToggle() {
    setError(null);

    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setError(
        mobileHint
          ? `Pushmeldingen werken hier pas na installatie. ${INSTALL_STEPS[mobileHint]}`
          : "Pushmeldingen worden niet ondersteund in deze browser."
      );
      return;
    }

    setPending(true);
    try {
      if (subscribed) {
        const sub = await getExistingPushSubscription();
        if (sub) {
          await sub.unsubscribe();
          await unsubscribeFromPushAction(sub.endpoint);
        }
        setSubscribed(false);
      } else {
        const sub = await subscribeToPush();
        const json = sub.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
          throw new Error("Aanmelden is niet gelukt.");
        }
        const result = await subscribeToPushAction({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        });
        if (result.error) throw new Error(result.error);
        setSubscribed(true);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Er ging iets mis.");
    } finally {
      setPending(false);
    }
  }

  // Zonder VAPID-sleutel op deze omgeving kan een subscribe-poging nooit
  // slagen — een interactieve schakelaar tonen die elke keer faalt is
  // misleidend (leek net op "aan, maar kapot" i.p.v. duidelijk "nog niet
  // beschikbaar"). Vaste, uitgelegde staat i.p.v. een levende schakelaar.
  // Omgevingsbreed (geen VAPID-sleutel überhaupt) i.p.v. een apparaat-
  // specifieke beperking, dus geen installatiehint hier.
  if (!PUSH_CONFIGURED) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Switch checked={false} onChange={() => {}} disabled label="Pushmeldingen (niet beschikbaar)" />
        <p className="text-right text-xs text-muted">Nog niet beschikbaar op deze omgeving.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Switch checked={subscribed} onChange={handleToggle} disabled={pending} label="Pushmeldingen" />
      {error && <p className="text-right text-xs text-danger-text">{error}</p>}
      {!error && mobileHint && <InstallHint platform={mobileHint} />}
    </div>
  );
}
