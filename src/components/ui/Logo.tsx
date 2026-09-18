import Image from "next/image";
import Link from "next/link";

export function Logo({ withLabel = true, className }: { withLabel?: boolean; className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className ?? ""}`}>
      <Image
        src="/brand/voc-logo-mark.png"
        alt="VOC"
        width={32}
        height={32}
        className="h-8 w-8"
        priority
      />
      {withLabel && (
        <span className="text-lg font-semibold tracking-tight text-foreground">
          VOC <span className="font-normal text-muted">Ledenportaal</span>
        </span>
      )}
    </Link>
  );
}
