"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/Switch";
import { subscribeToPushAction, unsubscribeFromPushAction } from "@/app/(app)/profiel/actions";
import { getExistingPushSubscription, subscribeToPush } from "@/lib/push/subscribe";

// NEXT_PUBLIC_-variabelen worden op build-tijd ingebakken in de client-
// bundle, dus dit is hier direct uit te lezen — geen los verzoek nodig.
const PUSH_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);

export function PushToggle() {
  const [subscribed, setSubscribed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!PUSH_CONFIGURED) return;
    getExistingPushSubscription().then((sub) => setSubscribed(Boolean(sub)));
  }, []);

  async function handleToggle() {
    setError(null);

    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setError("Pushmeldingen worden niet ondersteund in deze browser.");
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
      {error && <p className="text-right text-xs text-voc-red">{error}</p>}
    </div>
  );
}
