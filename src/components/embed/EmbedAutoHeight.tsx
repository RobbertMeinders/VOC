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

    post();
    window.parent.postMessage({ type: "voc-embed-scroll-top" }, "*");
    const observer = new ResizeObserver(post);
    observer.observe(document.documentElement);
    window.addEventListener("load", post);

    return () => {
      observer.disconnect();
      window.removeEventListener("load", post);
    };
  }, []);

  return null;
}
