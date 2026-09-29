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
export function EmbedAutoHeight() {
  useEffect(() => {
    function post() {
      window.parent.postMessage({ type: "voc-embed-height", height: document.documentElement.scrollHeight }, "*");
    }
    function postScrollTop() {
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

    return () => {
      observer.disconnect();
      window.removeEventListener("load", onLoad);
    };
  }, []);

  return null;
}
