"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";

// C15: /bedrijven/[id]/bewerken toont twee onafhankelijke formulieren
// (CompanyForm, CompanyBillingForm) met elk hun eigen "Opslaan"-knop — wie
// beide secties invult en maar op één knop klikt, verliest de andere sectie
// stilzwijgend zodra hij wegnavigeert. Bewust GEEN samenvoeging tot één
// mega-formulier (zie CompanyBillingForm's eigen toelichting): deze gedeelde,
// lichte dirty-registratie waarschuwt alleen vóór het versturen van één
// formulier als het ándere nog onopgeslagen wijzigingen heeft.
type Guard = {
  markDirty: (key: string, dirty: boolean) => void;
  confirmIfOthersDirty: (key: string) => boolean;
};

const GuardContext = createContext<Guard | null>(null);

export function CompanyEditFormsGuard({ children }: { children: ReactNode }) {
  const dirtyRef = useRef<Record<string, boolean>>({});

  const guard: Guard = {
    markDirty(key, dirty) {
      dirtyRef.current[key] = dirty;
    },
    confirmIfOthersDirty(key) {
      const othersDirty = Object.entries(dirtyRef.current).some(([k, v]) => k !== key && v);
      if (!othersDirty) return true;
      return window.confirm(
        "Je hebt ook nog niet-opgeslagen wijzigingen in het andere formulier op deze pagina. Dit opslaan bewaart alleen dit formulier. Toch doorgaan?"
      );
    },
  };

  return <GuardContext.Provider value={guard}>{children}</GuardContext.Provider>;
}

export function useCompanyEditFormsGuard(): Guard {
  const ctx = useContext(GuardContext);
  if (!ctx) throw new Error("useCompanyEditFormsGuard must be used within CompanyEditFormsGuard");
  return ctx;
}
