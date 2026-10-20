"use client";

import { createContext, useContext, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

// Robberts feedback: tabblad/periode wisselen "ging niet lekker" — een kale
// <Link> naar dezelfde pagina met alleen een andere ?tab=/?periode= laat de
// App Router de oude inhoud gewoon laten staan totdat de nieuwe server-
// content (tien-plus queries per tabblad) binnen is, zónder enige
// tussentijdse feedback. Een klik leek daardoor niets te doen, en toonde dan
// ineens, met een schok, de nieuwe inhoud. useTransition hier geeft de knop
// zelf meteen (optimistisch) zijn actieve status, en StatsContentArea kan
// `isPending` gebruiken om de content eronder tussentijds te dimmen i.p.v.
// stil te blijven hangen.
type StatsNavValue = { navigate: (href: string) => void; isPending: boolean };
const StatsNavContext = createContext<StatsNavValue | null>(null);

export function StatsNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(href: string) {
    startTransition(() => {
      router.push(href);
    });
  }

  return <StatsNavContext.Provider value={{ navigate, isPending }}>{children}</StatsNavContext.Provider>;
}

export function useStatsNav(): StatsNavValue {
  const ctx = useContext(StatsNavContext);
  if (!ctx) throw new Error("useStatsNav must be used within StatsNavProvider");
  return ctx;
}
