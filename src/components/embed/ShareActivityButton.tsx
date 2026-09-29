"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

// navigator.share (mobiel: opent het native deelmenu) met een clipboard-
// fallback (desktop, of wanneer de gebruiker het deelmenu zelf sluit) —
// zelfde copy-feedback-patroon als CopyEmbedCode. De URL is altijd
// window.location.origin, wat binnen de iframe naar voc-blue.vercel.app
// wijst (niet naar de WordPress-pagina eromheen) — precies de directe,
// unieke link naar déze activiteit die los van de iframe werkt.
export function ShareActivityButton({ activityId, title }: { activityId: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/embed/agenda/${activityId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // gebruiker annuleerde het deelmenu — geen fallback nodig
        return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
