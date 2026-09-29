"use client";

import { useEffect } from "react";

// Meldt de werkelijke hoogte van deze pagina aan het venster dat 'm in een
// iframe embedt (de VOC-website) — het bijbehorende scriptje in de
// embed-code (zie /beheer/embed-codes) zet daarmee de iframe-hoogte gelijk,
// zodat er nooit een eigen scrollbalkje in het iframe nodig is. "*" als
// doel-origin is bewust: welke website dit embedt weten we vooraf niet, en
// de payload bevat niets gevoeligers dan een pixelhoogte.
export function EmbedAutoHeight() {
  useEffect(() => {
    function post() {
      window.parent.postMessage({ type: "voc-embed-height", height: document.documentElement.scrollHeight }, "*");
    }

    post();
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
