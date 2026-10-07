import { Open_Sans } from "next/font/google";

// UX-review E3: alleen geladen door de /embed/*-pagina's voor het
// ?thema=website-uiterlijk (zie src/lib/embed/theme.ts) — de rest van de
// app blijft Inter (src/app/layout.tsx). Eén module i.p.v. per pagina een
// eigen next/font-aanroep, zodat het dezelfde font-subset/variabele deelt.
export const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});
