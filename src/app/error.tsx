"use client";

import { Logo } from "@/components/ui/Logo";
import { ErrorContent } from "@/components/ui/ErrorContent";

// Vangt een crash buiten (app)/layout.tsx om (bv. in de root layout zelf) —
// src/app/(app)/error.tsx vangt hetzelfde binnen de ingelogde sidebar/
// bottom-nav voor een crash op een gewone pagina.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8">
        <Logo />
      </div>
      <ErrorContent error={error} reset={reset} />
    </div>
  );
}
