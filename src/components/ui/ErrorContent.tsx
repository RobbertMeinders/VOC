"use client";

import { useEffect } from "react";
import { RotateCw } from "lucide-react";

// Gedeeld tussen de publieke en ingelogde error.tsx (zie NotFoundContent.tsx
// voor waarom er twee bestanden zijn i.p.v. één) — UX-review Q4: zonder
// eigen error.tsx toont een crash de Engelse standaardpagina van Next.js.
export function ErrorContent({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      <h1 className="mb-2 text-xl font-semibold text-foreground">Er ging iets mis</h1>
      <p className="mb-6 max-w-sm text-sm text-muted">Het is niet gelukt om deze pagina te laden.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="flex items-center gap-1.5 rounded-full bg-voc-red px-4 py-2 text-sm font-medium text-white hover:bg-voc-red-dark"
      >
        <RotateCw size={16} />
        Opnieuw proberen
      </button>
    </div>
  );
}
