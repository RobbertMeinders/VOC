"use client";

import { createContext, useContext, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

// Generieke versie van StatsNavContext (beheer/statistieken): een kale
// <Link>/<Chip href> naar dezelfde pagina met alleen een andere
// zoekparameter laat de App Router de oude inhoud gewoon laten staan totdat
// de nieuwe server-content binnen is, zonder enige tussentijdse feedback —
// een klik lijkt daardoor niets te doen. useTransition hier geeft de tab/
// chip zelf meteen (optimistisch) zijn actieve status, en TabContentArea
// gebruikt `isPending` om de content eronder tussentijds te dimmen i.p.v.
// stil te blijven hangen. Blijft bewust een losse context per
// TabNavProvider-boom (niet gedeeld tussen bv. agenda en een beheer-tab),
// zodat een navigatie op de ene pagina nooit de pending-status van een
// andere pagina beïnvloedt.
type TabNavValue = { navigate: (href: string) => void; isPending: boolean };
const TabNavContext = createContext<TabNavValue | null>(null);

export function TabNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(href: string) {
    startTransition(() => {
      router.push(href);
    });
  }

  return <TabNavContext.Provider value={{ navigate, isPending }}>{children}</TabNavContext.Provider>;
}

export function useTabNav(): TabNavValue {
  const ctx = useContext(TabNavContext);
  if (!ctx) throw new Error("useTabNav must be used within TabNavProvider");
  return ctx;
}
