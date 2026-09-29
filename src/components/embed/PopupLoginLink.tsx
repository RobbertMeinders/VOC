"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Waarom een pop-up i.p.v. gewoon target="_top": deze pagina draait in een
// iframe op een ander domein (de WordPress-site). Zelfs met een geldige
// portaalsessie in een ander tabblad stuurt de browser die sessiecookie
// nooit mee naar dit iframe (SameSite=Lax, en Safari/Firefox blokkeren
// third-party cookies sowieso altijd) — het portaal "weet" hier dus nooit
// wie je bent, ongeacht wat we los proberen te detecteren. Een pop-up is
// een gewone top-level navigatie naar het portaal zelf: daar werkt de
// sessiecookie gewoon normaal (first-party), dus inloggen/aanmelden lukt
// altijd, in elke browser — en de WordPress-pagina blijft intussen gewoon
// open i.p.v. dat je 'm helemaal verlaat.
export function PopupLoginLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Zonder deze cleanup blijft de poll-interval na het verlaten/ontmounten
  // van deze embed-pagina (bv. klikken naar een ander bedrijf terwijl de
  // login-pop-up nog openstaat) gewoon doortikken tegen een router-referentie
  // van een component die niet meer bestaat.
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function open(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const width = 460;
    const height = 720;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
    const popup = window.open(href, "voc-login", `width=${width},height=${height},left=${left},top=${top}`);
    if (!popup) {
      // Pop-up geblokkeerd door de browser: val terug op de oude, volle
      // navigatie i.p.v. dat er niets gebeurt.
      window.top!.location.href = href;
      return;
    }
    popup.focus();

    // Ververst deze embed-pagina zodra de pop-up weer dicht is — zonder dit
    // laat de teller "X aanmeldingen" nog het aantal van vóór je aanmelding
    // zien, ook al is die in de pop-up (op het echte portaal) al gelukt.
    const interval = setInterval(() => {
      if (popup.closed) {
        clearInterval(interval);
        intervalRef.current = null;
        router.refresh();
      }
    }, 500);
    intervalRef.current = interval;
  }

  return (
    <a href={href} onClick={open} className={className}>
      {children}
    </a>
  );
}
