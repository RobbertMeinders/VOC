"use client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(): Promise<PushSubscription> {
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Toestemming voor meldingen is niet gegeven.");
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error("Pushmeldingen zijn nog niet geconfigureerd.");
  }

  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    // @types/node's Uint8Array generic (ArrayBufferLike) and lib.dom's
    // PushManager.subscribe() (which wants ArrayBuffer specifically) don't
    // agree here even though this is a plain, freshly-allocated buffer.
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}
