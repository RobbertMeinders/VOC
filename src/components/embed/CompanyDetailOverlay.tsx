"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { CompanyDetailContent, type CompanyDetailData } from "./CompanyDetailContent";

// Hoelang we wachten op de omliggende WordPress-pagina's antwoord op
// voc-embed-request-viewport-offset voordat we terugvallen op 0 (bovenkant)
// — nodig voor bezoekers wier WordPress-pagina nog de oude embed-code heeft
// (zie /beheer/embed-codes), die dat bericht nog niet begrijpt/beantwoordt.
const OFFSET_TIMEOUT_MS = 300;

// Een echte zwevende overlay (bedrijvenlijst blijft zichtbaar/verduisterd
// erachter) i.p.v. de lijst te vervangen: deze iframe heeft zelf geen
// scrollbalk (de omliggende WordPress-pagina scrolt 'm als geheel mee), dus
// window.scrollY is hier altijd 0 — alleen de buitenpagina weet waar de
// bezoeker nu daadwerkelijk kijkt. We vragen dat op (voc-embed-
// request-viewport-offset, beantwoord door de embed-code) en positioneren
// het paneel daarop, zodat het direct in beeld verschijnt i.p.v. bovenaan
// de (mogelijk lange) lijst.
export function CompanyDetailOverlay({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [company, setCompany] = useState<CompanyDetailData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [offset, setOffset] = useState<number | null>(null);

  useEscapeKey(true, onClose);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/embed/companies/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<CompanyDetailData>;
      })
      .then((json) => {
        if (!cancelled) setCompany(json);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let responded = false;

    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "voc-embed-viewport-offset") {
        responded = true;
        setOffset(Math.max(0, e.data.offset));
      }
    }

    window.addEventListener("message", handleMessage);
    window.parent.postMessage({ type: "voc-embed-request-viewport-offset" }, "*");
    const timeout = setTimeout(() => {
      if (!responded) setOffset(0);
    }, OFFSET_TIMEOUT_MS);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(timeout);
    };
  }, []);

  // Nog geen positie bekend: liever heel even niets tonen dan een zichtbare
  // sprong van "bovenaan" naar de uiteindelijke plek.
  if (offset === null) return null;

  return (
    <div className="absolute inset-0 z-20 bg-black/40" onClick={onClose}>
      <div
        className="absolute left-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2"
        style={{ top: offset + 16 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:border-voc-red hover:text-voc-red"
        >
          <X size={18} />
        </button>

        {notFound ? (
          <div className="rounded-2xl bg-surface p-6 text-center text-sm text-muted shadow-sm">Bedrijf niet gevonden.</div>
        ) : !company ? (
          <div className="rounded-2xl bg-surface p-6 text-center text-sm text-muted shadow-sm">Laden…</div>
        ) : (
          <CompanyDetailContent company={company} />
        )}
      </div>
    </div>
  );
}
