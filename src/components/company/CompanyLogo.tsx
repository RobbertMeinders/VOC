"use client";

import { useState } from "react";
import Image from "next/image";
import { Building2 } from "lucide-react";

// UX-review T3: twee losse problemen met dezelfde tegel. (1) Een felwitte
// tegel in donker thema geeft in een lijst van 114 bedrijven een raster van
// witte vlakken — #EDEDED i.p.v. #FFFFFF in donker is net genoeg gedempt om
// dat te verzachten, zonder de tegel te donker te maken voor logo's die voor
// een lichte achtergrond getekend zijn. (2) Tijdens laden was een tegel met
// wél een logoUrl eerst gewoon leeg (de afbeelding laadt async) — de
// initialen staan er daarom al vóór de <Image> in de DOM, zodat ze zichtbaar
// zijn totdat de afbeelding erover geschilderd is, zonder een eigen
// load-state bij te houden.
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

// De meeste bedrijfslogo's zijn liggend, niet vierkant — object-cover in een
// vierkant vlak sneed die aan de zijkanten af (tekst kwijt). object-contain
// voorkomt dat, maar liet in een vierkant vlak nog wel lege ruimte boven/
// onder een liggend logo over. Elke tegel krijgt daarom altijd dezelfde
// liggende 1,35:1-verhouding — eerder had alleen een paar prominente plekken
// (bedrijvenkaart, -profiel) dat en bleven kleine, compacte plekken
// (lijstrijen, "werkzaam bij") vierkant, maar dat liet bij een logo met een
// volledig gevulde (niet-transparante) achtergrondkleur een storende rand
// zien die per pagina verschilde. Eén vaste verhouding overal is
// voorspelbaar: soms een klein randje, maar nooit meer op de ene plek
// netjes en op de andere scheef.
export function CompanyLogo({
  logoUrl,
  name,
  size = 64,
}: {
  logoUrl: string | null;
  name: string;
  size?: number;
}) {
  // Eén mislukte laadpoging (bv. een verlopen signed URL) liet hier het kale,
  // lelijke "afbeelding niet gevonden"-icoon van de browser zien i.p.v. de
  // eigen Building2-fallback — deze vlag valt terug op die fallback zodra de
  // afbeelding zelf een fout meldt, voor alle gebruiksplekken tegelijk i.p.v.
  // dat losse embed-pagina's dit ieder apart moeten regelen.
  const [failed, setFailed] = useState(false);
  const width = Math.round(size * 1.35);
  const showImage = logoUrl && !failed;
  return (
    <div
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white dark:bg-[#EDEDED]"
      style={{ width, height: size }}
    >
      {showImage ? (
        <>
          <span
            aria-hidden
            className="absolute text-xs font-semibold text-muted"
            style={{ fontSize: Math.max(10, Math.round(size * 0.22)) }}
          >
            {initials(name)}
          </span>
          <Image
            src={logoUrl}
            alt={name}
            width={width}
            height={size}
            onError={() => setFailed(true)}
            className="relative h-full w-full object-contain"
          />
        </>
      ) : (
        <Building2 size={Math.round(size * 0.45)} className="text-voc-red-text" />
      )}
    </div>
  );
}
