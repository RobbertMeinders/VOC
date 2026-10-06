import Image from "next/image";
import Link from "next/link";

// logoUrl/siteName komen van app_settings (zie src/lib/settings/app-settings.ts)
// — als props i.p.v. hier zelf opgehaald, want dit component wordt vanuit
// Sidebar/MobileHeader (beide Client Components) gerenderd en kan dus geen
// eigen server-only databasecall doen. Standaardwaarden houden dit component
// ook bruikbaar zonder dat elke aanroeper ze hoeft mee te geven.
export function Logo({
  withLabel = true,
  className,
  logoUrl,
  siteName,
}: {
  withLabel?: boolean;
  className?: string;
  logoUrl?: string | null;
  siteName?: string;
}) {
  return (
    <Link href="/" className={`flex min-w-0 items-center gap-2 ${className ?? ""}`}>
      <Image
        src={logoUrl || "/brand/voc-logo-mark.png"}
        alt={siteName ?? "VOC"}
        width={32}
        height={32}
        unoptimized={Boolean(logoUrl)}
        className="h-8 w-8 shrink-0 object-contain"
        priority
      />
      {withLabel && (
        // truncate i.p.v. altijd de volledige tekst tonen: in de sidebar-
        // header staan de zoek-/notificatie-icoontjes ernaast in dezelfde
        // rij, en zonder dit overlapte de naam die icoontjes zodra de rij te
        // smal werd i.p.v. netjes af te breken.
        <span className="truncate text-lg font-semibold tracking-tight text-foreground">{siteName ?? "Ledenportaal"}</span>
      )}
    </Link>
  );
}
