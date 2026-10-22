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
// op een platform zonder stappenlijst (handleToggle hieronder) — "other"
// heeft geen InstallHint-blok om naar te verwijzen, dus die foutmelding
// moet wel zelf de volledige uitleg geven.
const INSTALL_SUMMARY_OTHER =
  "Zet het portaal via het menu van je browser op je startscherm en open het daarna via dat icoon.";

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
//
// Geen eigen breedte-beperking (eerder self-stretch binnen een door
// SettingSubRow afgedwongen smalle rechterkolom) — dat liet het label
// "Zo krijg je meldingen op je telefoon" lelijk afbreken met het pijltje
// los erboven. PushToggle rendert zichzelf nu buiten SettingSubRow om
// (zie instellingen/page.tsx), dus dit blok krijgt gewoon de volle breedte
// van de instellingengroep.
function InstallHint({ platform }: { platform: Platform }) {
  const steps = INSTALL_STEPS[platform];
  if (!steps) {
    return <p className="text-sm text-muted sm:hidden">{INSTALL_SUMMARY_OTHER}</p>;
  }
  return (
    <div className="text-left sm:hidden">
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
      // Bij een mobileHint met een stappenlijst (iOS/Android) staat de
      // volledige uitleg al in InstallHint hieronder (die na een mislukte
      // poging nu ook in beeld blijft, zie de render hieronder) — deze
      // melding hoeft dat dan niet te herhalen.
      setError(
        mobileHint && !INSTALL_STEPS[mobileHint]
          ? `Pushmeldingen werken hier pas na installatie. ${INSTALL_SUMMARY_OTHER}`
          : mobileHint
            ? "Pushmeldingen werken hier pas na installatie — zie de uitleg hieronder."
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
  // Geen SettingSubRow (zie instellingen/page.tsx) — die dwingt alles in een
  // smalle kolom rechts van het label, waar InstallHint's stappenlijst
  // lelijk in afbrak (live feedback). Dit component regelt de label/
  // schakelaar-rij nu zelf, op volle breedte van de instellingengroep.
  if (!PUSH_CONFIGURED) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-foreground">Dit apparaat</span>
          <Switch checked={false} onChange={() => {}} disabled label="Pushmeldingen (niet beschikbaar)" />
        </div>
        <p className="text-right text-xs text-muted">Nog niet beschikbaar op deze omgeving.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-foreground">Dit apparaat</span>
        <Switch checked={subscribed} onChange={handleToggle} disabled={pending} label="Pushmeldingen" />
      </div>
      {error && <p className="text-right text-xs text-danger-text">{error}</p>}
      {/* Blijft ook na een mislukte poging zichtbaar (voorheen verdween dit
          blok zodra error gezet werd) -- anders leek het alsof er niks meer
          kon na een eerste tik, terwijl juist dan de uitleg het hardst nodig is. */}
      {mobileHint && <InstallHint platform={mobileHint} />}
    </div>
  );
}
