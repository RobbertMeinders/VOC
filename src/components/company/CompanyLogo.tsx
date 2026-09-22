import Image from "next/image";
import { Building2 } from "lucide-react";

// De meeste bedrijfslogo's zijn liggend, niet vierkant — `object-cover` in
// een vierkant vlak sneed die eerder aan de zijkanten af. Een vast wit
// tegeltje met `object-contain` en wat binnenmarge laat elk formaat logo
// (liggend, staand, vierkant) heel en consistent ogen, ongeacht het thema.
export function CompanyLogo({ logoUrl, name, size = 64 }: { logoUrl: string | null; name: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white p-1.5"
      style={{ width: size, height: size }}
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={name}
          width={size}
          height={size}
          className="h-full w-full object-contain"
        />
      ) : (
        <Building2 size={Math.round(size * 0.45)} className="text-voc-red" />
      )}
    </div>
  );
}
