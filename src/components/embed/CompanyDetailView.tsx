"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { CompanyDetailContent, type CompanyDetailData } from "./CompanyDetailContent";

// Vervangt de bedrijvenlijst in normale document-flow (zie
// BedrijvenEmbedList voor waarom) i.p.v. er als `position: absolute`-overlay
// overheen te zweven — dat laatste erfde de hoogte van de (mogelijk veel
// langere) lijst erachter, wat een groot leeg grijs vlak rond een klein
// kaartje opleverde. Zelfde opmaak als de losstaande
// /embed/bedrijven/[slug]-pagina, alleen hier client-side opgehaald i.p.v.
// server-side gerenderd, zodat er geen echte paginanavigatie nodig is.
export function CompanyDetailView({ slug, onBack }: { slug: string; onBack: () => void }) {
  const [company, setCompany] = useState<CompanyDetailData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEscapeKey(true, onBack);

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

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-voc-red hover:underline"
      >
        <ArrowLeft size={16} />
        Terug naar bedrijvengids
      </button>

      {notFound ? (
        <div className="rounded-2xl bg-surface p-6 text-center text-sm text-muted shadow-sm">Bedrijf niet gevonden.</div>
      ) : !company ? (
        <div className="rounded-2xl bg-surface p-6 text-center text-sm text-muted shadow-sm">Laden…</div>
      ) : (
        <CompanyDetailContent company={company} />
      )}
    </div>
  );
}
