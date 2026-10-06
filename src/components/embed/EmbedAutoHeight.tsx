"use client";

import { useEffect } from "react";

// Meldt de werkelijke hoogte van deze pagina aan het venster dat 'm in een
// iframe embedt (de VOC-website) — het bijbehorende scriptje in de
// embed-code (zie /beheer/embed-codes) zet daarmee de iframe-hoogte gelijk,
// zodat er nooit een eigen scrollbalkje in het iframe nodig is. "*" als
// doel-origin is bewust: welke website dit embedt weten we vooraf niet, en
// de payload bevat niets gevoeligers dan een pixelhoogte.
//
// Deze iframe heeft zelf geen scrollbalk (de hoogte volgt de inhoud), dus
// scrollen gebeurt altijd op de omliggende WordPress-pagina. Klik je op een
// kaart verderop in een lange, naar beneden gescrolde agenda, dan blijft die
// pagina op precies dezelfde scrollpositie staan terwijl de iframe-inhoud
// wisselt naar de detailpagina — je ziet dan zomaar het midden van een
// andere pagina, zonder titel/context erboven. Elke embed-pagina rendert
// deze component opnieuw bij het opnavigeren (aparte route, geen gedeelde
// layout), dus "bij het mounten" is precies het navigatiemoment: meld dan
// ook meteen dat de omliggende pagina terug naar de bovenkant van de
// iframe moet scrollen.
//
// Uitzondering: de állereerste keer dat deze iframe ooit laadt (de bezoeker
// komt gewoon op de WordPress-pagina terecht) staat die pagina al waar hij
// moet staan — een scroll-top-melding dán liet de hele buitenpagina meteen
// bij binnenkomst een stukje verspringen. Deze module-scoped vlag overleeft
// client-side navigatie binnen dezelfde iframe (Next.js Link, geen page
// reload) maar reset bij een echte (her)load van de iframe, dus normale
// in-embed-navigatie (lijst -> detail, of terug) blijft wél scrollen.
let hasMountedBefore = false;

// Los aanroepbaar (i.p.v. alleen via de mount-logica hieronder) voor
// content die binnen dezelfde pagina wisselt zonder te remounten — zie
// BedrijvenEmbedList, dat de lijst client-side vervangt door een
// bedrijfsdetail. Zonder deze melding blijft de omliggende WordPress-pagina
// op zijn oude scrollpositie staan terwijl de iframe-inhoud daaronder
// wegvalt/verandert, met hetzelfde "je ziet zomaar het midden van iets
// anders"-effect als bij een gewone paginanavigatie (zie boven).
export function scrollEmbedToTop() {
  window.parent.postMessage({ type: "voc-embed-scroll-top" }, "*");
}

export function EmbedAutoHeight() {
  useEffect(() => {
    const isFirstMountEver = !hasMountedBefore;
    hasMountedBefore = true;

    function post() {
      window.parent.postMessage({ type: "voc-embed-height", height: document.documentElement.scrollHeight }, "*");
    }
    function postScrollTop() {
      if (isFirstMountEver) return;
      window.parent.postMessage({ type: "voc-embed-scroll-top" }, "*");
    }

    post();
    postScrollTop();
    const observer = new ResizeObserver(post);
    observer.observe(document.documentElement);
    // De hoogte vlak na mount is vaak nog niet definitief (een logo/foto die
    // nog moet laden maakt de pagina alsnog langer) — de eerste scroll-top
    // hierboven rekent dan met een te lage hoogte, waardoor de omliggende
    // pagina alsnog ergens halverwege blijft steken i.p.v. helemaal boven-
    // aan. Na "load" is de layout wel definitief, dus dan nog eens.
    function onLoad() {
      post();
      postScrollTop();
    }
    window.addEventListener("load", onLoad);

    // Vangnet tegen een WordPress-pagina die zijn eigen listener-scriptje
    // (zie /beheer/embed-codes) vertraagd laadt — bijv. door een
    // optimalisatieplugin die scripts defer/async zet. Zo'n listener mist de
    // post()-aanroepen hierboven simpel omdat 'ie nog niet bestond toen ze
    // verstuurd werden (postMessage herhaalt gemiste berichten niet). Door
    // de eerste 10s elke seconde opnieuw te posten is de kans groot dat de
    // listener, zodra 'ie er eenmaal is, een van die herhalingen alsnog
    // opvangt — zonder voor altijd te blijven doorposten als er nooit een
    // listener komt (bijv. deze pagina los in een tabblad, zonder iframe).
    const retryInterval = window.setInterval(post, 1000);
    const retryTimeout = window.setTimeout(() => window.clearInterval(retryInterval), 10_000);

    // Nog een vangnet, deze keer vanuit de website zelf: zodra het
    // listener-scriptje daar alsnog actief wordt (ook na die 10s), kan het
    // via dit bericht alsnog meteen om de huidige hoogte vragen i.p.v. te
    // moeten wachten op de volgende toevallige ResizeObserver-trigger.
    function onMessage(event: MessageEvent) {
      if (event.data?.type === "voc-embed-request-height") post();
    }
    window.addEventListener("message", onMessage);

    return () => {
      observer.disconnect();
      window.removeEventListener("load", onLoad);
      window.clearInterval(retryInterval);
      window.clearTimeout(retryTimeout);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  return null;
}
