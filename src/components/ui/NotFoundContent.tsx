import Link from "next/link";
import { Home, Search } from "lucide-react";

// Gedeeld tussen de publieke 404 (src/app/not-found.tsx, buiten de
// app-shell om — bv. een kapotte link naar /login) en de ingelogde 404
// (src/app/(app)/not-found.tsx, die wél binnen de gewone sidebar/bottom-nav
// rendert omdat Next.js 'm als children van (app)/layout.tsx plaatst) — zie
// UX-review V7: de standaard Next.js-pagina was Engels, zonder navigatie en
// puur zwart in donker thema.
export function NotFoundContent() {
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      <h1 className="mb-2 text-xl font-semibold text-foreground">Deze pagina bestaat niet (meer)</h1>
      <p className="mb-6 max-w-sm text-sm text-muted">
        Controleer de link, of ga terug naar een van de volgende pagina&apos;s.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-full bg-voc-red px-4 py-2 text-sm font-medium text-white hover:bg-voc-red-dark"
        >
          <Home size={16} />
          Home
        </Link>
        <Link
          href="/zoeken"
          className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
        >
          <Search size={16} />
          Zoeken
        </Link>
      </div>
    </div>
  );
}
