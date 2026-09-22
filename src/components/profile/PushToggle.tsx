"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/Switch";
import { subscribeToPushAction, unsubscribeFromPushAction } from "@/app/(app)/profiel/actions";
import { getExistingPushSubscription, subscribeToPush } from "@/lib/push/subscribe";

export function PushToggle() {
  const [subscribed, setSubscribed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

  return (
    <div className="flex flex-col items-end gap-1">
      <Switch checked={subscribed} onChange={handleToggle} disabled={pending} label="Pushmeldingen" />
      {error && <p className="text-right text-xs text-voc-red">{error}</p>}
    </div>
  );
}
