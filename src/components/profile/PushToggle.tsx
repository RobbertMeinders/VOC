"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal, MoreVertical, Share, ChevronDown, SquarePlus, Download, Smartphone, type LucideIcon } from "lucide-react";
import { Switch } from "@/components/ui/Switch";
import { AnimatedDisclosure } from "@/components/ui/AnimatedDisclosure";
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

// Beknopte samenvatting voor de foutmelding bij een mislukte toggle-poging
// (handleToggle hieronder) — de stappenlijst met icoontjes (INSTALL_STEPS)
// is voor het inklapbare uitlegblok, dat leent zich niet voor inline tekst.
const INSTALL_SUMMARY: Record<Platform, string> = {
  ios: 'Tik op Deel en kies "Zet op beginscherm" om het portaal te installeren. Open het daarna via dat icoon.',
  android: 'Tik op het menu en kies "App installeren" om het portaal te installeren. Open het daarna via dat icoon.',
  other: "Zet het portaal via het menu van je browser op je startscherm en open het daarna via dat icoon.",
};

type InstallStep = { Icon: LucideIcon; text: string };

// Icoontjes zijn de bestaande lucide-componenten (dezelfde stijl als de
// rest van de app, geen los nagetekende SVG): Share/ChevronDown/SquarePlus
// volgen letterlijk Safari's eigen deel- en "zet op beginscherm"-iconen.
const IOS_STEPS: InstallStep[] = [
  { Icon: MoreHorizontal, text: "Tik onderin in Safari op de drie puntjes." },
  { Icon: Share, text: "Tik op Deel." },
  { Icon: ChevronDown, text: 'Tik op "Toon meer".' },
  { Icon: SquarePlus, text: 'Kies "Zet op beginscherm".' },
  { Icon: Smartphone, text: "Open het portaal via het nieuwe icoon en zet meldingen aan." },
];

const ANDROID_STEPS: InstallStep[] = [
  { Icon: MoreVertical, text: "Tik op het menu (drie puntjes)." },
  { Icon: Download, text: 'Kies "App installeren" of "Toevoegen aan startscherm".' },
  { Icon: Smartphone, text: "Open daarna via dat icoon en zet meldingen aan." },
];

const INSTALL_STEPS: Record<Platform, InstallStep[] | null> = {
  ios: IOS_STEPS,
  android: ANDROID_STEPS,
  other: null,
};

// Alleen op mobiel relevant (sm:hidden) en alleen zolang het portaal nog
// niet als geinstalleerde app draait: staat het al op het beginscherm, dan
// werkt de schakelaar hierboven gewoon en hoort dit blokje niet in de weg
// te staan. null bij de eerste render (geen window/navigator op de server)
// voorkomt een hydratie-mismatch i.p.v. de hint eerst te laten flashen.
// Standaard uitgeklapt (defaultOpen): de vorige, platte-tekst versie was
// bewust meteen zichtbaar omdat de schakelaar anders een doodlopend eindje
// leek, en dat blijft hier het uitgangspunt — inklapbaar is voor wie 'm al
// kent, niet om 'm bij voorbaat te verbergen.
function InstallHint({ platform }: { platform: Platform }) {
  const steps = INSTALL_STEPS[platform];
  if (!steps) {
    return <p className="text-right text-xs text-muted sm:hidden">{INSTALL_SUMMARY.other}</p>;
  }
  return (
    <div className="self-stretch text-left sm:hidden">
      <AnimatedDisclosure label="Zo krijg je meldingen op je telefoon" defaultOpen>
        <ol className="flex flex-col gap-2">
          {steps.map(({ Icon, text }, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-muted">
              <Icon size={15} className="shrink-0" aria-hidden="true" />
              <span>{text}</span>
            </li>
          ))}
        </ol>
      </AnimatedDisclosure>
    </div>
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
          ? `Pushmeldingen werken hier pas na installatie. ${INSTALL_SUMMARY[mobileHint]}`
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
