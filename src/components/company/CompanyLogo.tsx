import Image from "next/image";
import { Building2 } from "lucide-react";

export function CompanyLogo({ logoUrl, name, size = 64 }: { logoUrl: string | null; name: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white"
      style={{ width: size, height: size }}
    >
      {logoUrl ? (
        <Image src={logoUrl} alt={name} width={size} height={size} className="h-full w-full object-cover" />
      ) : (
        <Building2 size={Math.round(size * 0.45)} className="text-voc-red" />
      )}
    </div>
  );
}
