import Image from "next/image";
import Link from "next/link";

export function Logo({ withLabel = true, className }: { withLabel?: boolean; className?: string }) {
  return (
    <Link href="/" className={`flex min-w-0 items-center gap-2 ${className ?? ""}`}>
      <Image
        src="/brand/voc-logo-mark.png"
        alt="VOC"
        width={32}
        height={32}
        className="h-8 w-8 shrink-0"
        priority
      />
      {withLabel && (
        // truncate i.p.v. altijd de volledige tekst tonen: in de sidebar-
        // header staan de zoek-/notificatie-icoontjes ernaast in dezelfde
        // rij, en zonder dit overlapte "Ledenportaal" die icoontjes zodra de
        // rij te smal werd i.p.v. netjes af te breken.
        <span className="truncate text-lg font-semibold tracking-tight text-foreground">Ledenportaal</span>
      )}
    </Link>
  );
}
