"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

// navigator.share (mobiel: opent het native deelmenu) met een clipboard-
// fallback (desktop, of wanneer de gebruiker het deelmenu zelf sluit) —
// zelfde copy-feedback-patroon als CopyEmbedCode. De URL is altijd
// window.location.origin, wat binnen de iframe naar voc-blue.vercel.app
// wijst (niet naar de WordPress-pagina eromheen) — precies de directe,
// unieke link naar déze activiteit die los van de iframe werkt.
// document.execCommand('copy') i.p.v. enkel navigator.clipboard.writeText():
// in een cross-origin iframe (deze pagina, ingeladen vanaf de WordPress-
// site) staat clipboard-write standaard NIET toe zonder een expliciet
// allow="clipboard-write" op de <iframe> zelf — zonder fallback gooide dat
// een onopgevangen fout en leek de knop niets te doen. execCommand werkt
// wél zonder die Permissions-Policy-toestemming.
function legacyCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}

export function ShareActivityButton({ activityId, title }: { activityId: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/embed/agenda/${activityId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        // gebruiker annuleerde het deelmenu zelf — geen fallback nodig
        if (err instanceof Error && err.name === "AbortError") return;
        // anders (bv. de iframe staat web-share niet toe): val terug op kopiëren
      }
    }

    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      ok = legacyCopy(url);
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-black/[.04]"
    >
      {copied ? <Check size={15} className="text-green-600" /> : <Share2 size={15} />}
      {copied ? "Link gekopieerd" : "Delen"}
    </button>
  );
}
