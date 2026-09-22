import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Simpele "ga terug"-link op geneste pagina's (bv. /beheer/...) — bewust
// geen kruimelpad (dat oogde als een aparte plek in de site waar je een
// pad naartoe moest zien, terwijl dit gewoon "terug naar het overzicht" is).
// Bewust NIET op overlay-routes (@modal/(.)...): die voelen al aan als een
// laag boven de huidige pagina. Daarom leeft dit component alleen in
// page.tsx-bestanden zelf, nooit in de *Content.tsx die met een overlay
// wordt gedeeld.
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mb-3 flex w-fit items-center gap-1.5 text-sm text-muted hover:text-voc-red">
      <ArrowLeft size={16} />
      {label}
    </Link>
  );
}
