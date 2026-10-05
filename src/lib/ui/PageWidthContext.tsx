"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type PageWidthContextValue = { wide: boolean; setWide: (wide: boolean) => void };

const PageWidthContext = createContext<PageWidthContextValue | null>(null);

// Standaard begrenst AppShell de paginainhoud op max-w-6xl — prettig voor
// lijstjes en formulieren, te krap voor een contentzware editor (zie
// FullWidthPage). Eén context i.p.v. een prop door de hele boom, want het
// is maar één pagina op een moment die dit nodig heeft.
export function PageWidthProvider({ children }: { children: ReactNode }) {
  const [wide, setWide] = useState(false);
  return <PageWidthContext.Provider value={{ wide, setWide }}>{children}</PageWidthContext.Provider>;
}

export function usePageWidth(): PageWidthContextValue {
  const ctx = useContext(PageWidthContext);
  if (!ctx) throw new Error("usePageWidth must be used within PageWidthProvider");
  return ctx;
}
