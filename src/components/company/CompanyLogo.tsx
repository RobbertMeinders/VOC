import Image from "next/image";
import { Building2 } from "lucide-react";

// De meeste bedrijfslogo's zijn liggend, niet vierkant — object-cover in een
// vierkant vlak sneed die aan de zijkanten af (tekst kwijt). object-contain
// voorkomt dat, maar liet in een vierkant vlak nog wel lege ruimte boven/
// onder een liggend logo over. `wide` geeft het vlak zelf een liggende
// verhouding i.p.v. vierkant, voor plekken waar het logo prominent
// getoond wordt (bedrijvenkaart, -profiel) — kleine, compacte plekken
// (lijstrijen, "werkzaam bij") blijven vierkant.
export function CompanyLogo({
  logoUrl,
  name,
  size = 64,
  wide = false,
}: {
  logoUrl: string | null;
  name: string;
  size?: number;
  wide?: boolean;
}) {
  const width = wide ? Math.round(size * 1.35) : size;
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white"
      style={{ width, height: size }}
    >
      {logoUrl ? (
        <Image src={logoUrl} alt={name} width={width} height={size} className="h-full w-full object-contain" />
      ) : (
        <Building2 size={Math.round(size * 0.45)} className="text-voc-red-text" />
      )}
    </div>
  );
}
