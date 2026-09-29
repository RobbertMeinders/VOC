"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { CompanyDetailContent, type CompanyDetailData } from "./CompanyDetailContent";

// Getoond i.p.v. de bedrijvenlijst (zie BedrijvenEmbedList) i.p.v. als een
// echte position:fixed modal met verduisterde achtergrond: deze iframe heeft
// zelf geen scrollbalk en de omliggende WordPress-pagina scrolt 'm als geheel
// mee, dus "fixed" gedraagt zich hier relatief t.o.v. de hele (potentieel
// zeer lange) iframe-hoogte i.p.v. t.o.v. wat er nu daadwerkelijk in beeld
// is — en een element dat buiten de normale document-flow valt telt ook niet
// mee voor document.documentElement.scrollHeight, waarmee EmbedAutoHeight de
// iframe-hoogte bepaalt: bij lange bedrijfsprofielen zou het einde ervan dan
// gewoon onbereikbaar zijn. Gewoon in de normale flow renderen (deze lijst
// vervangen door de detailweergave) lost beide problemen tegelijk op.
export function CompanyDetailOverlay({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [company, setCompany] = useState<CompanyDetailData | null>(null);
  const [notFound, setNotFound] = useState(false);

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
    <div className="mx-auto w-full max-w-lg">
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
  );
}
