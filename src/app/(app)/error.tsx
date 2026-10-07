"use client";

import { ErrorContent } from "@/components/ui/ErrorContent";

// Rendert als children van (app)/layout.tsx — dus automatisch binnen
// AppShell. Vangt een crash binnen een gewone pagina onder (app); een
// crash in (app)/layout.tsx zelf (bv. requireProfile()) belandt bij de
// root error.tsx, want een error.tsx vangt nooit een fout in de layout op
// zijn eigen niveau.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorContent error={error} reset={reset} />;
}
