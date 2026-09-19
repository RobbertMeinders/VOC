"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
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
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        className="flex items-center gap-2 self-start rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:border-voc-red disabled:opacity-60"
      >
        {subscribed ? <BellOff size={16} /> : <Bell size={16} />}
        {pending ? "Bezig…" : subscribed ? "Pushmeldingen uitzetten" : "Pushmeldingen aanzetten"}
      </button>
      {error && <p className="text-xs text-voc-red">{error}</p>}
    </div>
  );
}
