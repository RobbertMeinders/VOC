"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { useEffect, useRef, useState, type ReactNode } from "react";

type SegmentedItem = {
  key: string;
  label: ReactNode;
  active: boolean;
} & ({ href: string; onClick?: undefined } | { href?: undefined; onClick: () => void });

// Redesign-besluit 5: een 2(/3)-weg modusschakelaar (Leden/Bedrijven,
// Lijst/Kalender) — zachte "track" met een surface+schaduw-pil op de
// actieve stand, net als de periodekeuze op beheer/statistieken. Anders
// dan Chip (losse filter-chips, actief = inkt): dit is één samenhangend
// geheel voor "kies één van deze twee/drie standen".
//
// Ontwerpfeedback (netwerk-schakelaar-petrol.png): voor een keuze die er
// echt toe doet (welke volledig andere lijst je ziet, niet alleen een
// weergavevoorkeur) is de neutrale surface-pil te onopvallend — de
// "petrol"-variant vult de actieve stand met --petrol en witte tekst i.p.v.
// surface+inkt.
//
// Identiteit Fase 2 ("rood voert, petrol draagt"): een nieuwe "rood"-variant
// voor de gekozen stand van een schakelaar als dié ANKER is (bv. Lijst/
// Kaart) — dit draait het eerdere "rood blijft gereserveerd voor acties"
// bewust terug voor dit soort gekozen-stand-schakelaars. Bestaande
// "petrol"-aanroepplekken blijven ongewijzigd petrol.
export function SegmentedControl({
  items,
  className,
  variant = "subtle",
}: {
  items: SegmentedItem[];
  className?: string;
  variant?: "subtle" | "petrol" | "rood";
}) {
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.active)
  );
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  // Afwerkronde blok 5: de actieve pil schuift naar de nieuwe stand i.p.v.
  // er instant naartoe te springen. De items zijn flex-1 (dus niet per se
  // gelijke breedte bij ongelijke labels in sommige gevallen) — daarom hier
  // echt de offset/breedte van het actieve item gemeten i.p.v. aangenomen,
  // met een ResizeObserver zodat een responsive breedtewijziging (bv.
  // tekstlabels die op een ander formaat anders afbreken) de pil meeneemt.
  useEffect(() => {
    function measure() {
      const el = itemRefs.current[activeIndex];
      const track = trackRef.current;
      if (!el || !track) return;
      setIndicator({ left: el.offsetLeft - track.clientLeft, width: el.offsetWidth });
    }
    measure();

    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [activeIndex, items.length]);

  return (
    <div ref={trackRef} className={clsx("relative inline-flex gap-1 rounded-xl bg-raised p-1", className)}>
      {indicator && (
        <div
          aria-hidden
          className={clsx(
            "absolute inset-y-1 rounded-lg transition-[transform,width] duration-200 ease-out motion-reduce:transition-none",
            variant === "petrol" ? "bg-petrol shadow-sm" : variant === "rood" ? "bg-voc-red shadow-sm" : "bg-surface shadow-sm"
          )}
          style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }}
        />
      )}
      {items.map((item, index) => {
        const itemClassName = clsx(
          "relative z-10 flex-1 rounded-lg px-3 py-1.5 text-center text-sm transition-colors",
          // Stijlronde: de gekozen stand duidelijker — ook het gewicht van
          // het label mee laten wisselen, niet alleen de kleur.
          item.active
            ? variant === "petrol"
              ? "font-semibold text-white dark:text-petrol-deep"
              : variant === "rood"
                ? "font-semibold text-white"
                : "font-semibold text-foreground"
            : "font-medium text-muted hover:text-foreground"
        );
        if (item.href) {
          return (
            <Link
              key={item.key}
              href={item.href}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              className={itemClassName}
            >
              {item.label}
            </Link>
          );
        }
        return (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            className={itemClassName}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
