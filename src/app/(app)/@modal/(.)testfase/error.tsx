"use client";

import { ErrorContent } from "@/components/ui/ErrorContent";

// Zonder deze error.tsx ving de dichtstbijzijnde bovenliggende error.tsx
// ((app)/error.tsx) een crash hier op — die vervangt de HELE pagina
// eronder, terwijl layout.tsx (RouteOverlayPanel) hier juist alleen de
// overlay-inhoud hoort te vervangen, met behoud van het kruisje/
// sleepgebaar en de onderliggende pagina.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorContent error={error} reset={reset} />;
}
