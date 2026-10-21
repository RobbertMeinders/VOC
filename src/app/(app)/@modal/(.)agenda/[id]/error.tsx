"use client";

import { ErrorContent } from "@/components/ui/ErrorContent";

// Dekt zowel deze page.tsx als [id]/bewerken/page.tsx (die geen eigen
// layout.tsx heeft, en dus ook geen eigen error.tsx nodig zou hebben — maar
// error.tsx wordt niet overgenomen van de layout, dus deze geldt al voor
// beide). Zonder deze error.tsx ving de dichtstbijzijnde bovenliggende
// error.tsx ((app)/error.tsx) een crash hier op — die vervangt de HELE
// pagina (inclusief de agendalijst eronder), terwijl layout.tsx
// (RouteOverlayPanel) hier juist alleen de overlay-inhoud hoort te
// vervangen, met behoud van het kruisje/sleepgebaar en de onderliggende
// pagina.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorContent error={error} reset={reset} />;
}
