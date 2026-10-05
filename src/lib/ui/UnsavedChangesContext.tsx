"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// Eén gedeelde "staat er een formulier met niet-opgeslagen wijzigingen
// open"-vlag, zodat RouteOverlayPanel's sluit-knoppen (Esc, kruisje,
// naar-beneden-vegen) eerst een bevestiging kunnen vragen i.p.v. een
// half ingevuld activiteitformulier zomaar te laten verdwijnen. Een
// formulier dat dit wil, markeert zichzelf via setDirty(true) bij de eerste
// wijziging en weer false na een geslaagde submit/bij unmount.
type UnsavedChangesContextValue = {
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
  confirmDiscard: () => boolean;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [isDirty, setIsDirty] = useState(false);

  const value: UnsavedChangesContextValue = {
    isDirty,
    setDirty: setIsDirty,
    confirmDiscard: () =>
      !isDirty || window.confirm("Je hebt niet-opgeslagen wijzigingen. Weet je zeker dat je wilt sluiten?"),
  };

  return <UnsavedChangesContext.Provider value={value}>{children}</UnsavedChangesContext.Provider>;
}

export function useUnsavedChanges(): UnsavedChangesContextValue {
  const ctx = useContext(UnsavedChangesContext);
  if (!ctx) throw new Error("useUnsavedChanges must be used within an UnsavedChangesProvider");
  return ctx;
}
