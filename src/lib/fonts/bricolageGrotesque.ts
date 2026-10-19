import { Bricolage_Grotesque } from "next/font/google";

// Redesign-besluit 1 (docs/redesign-ontwerp.md): kopletter voor paginatitels,
// grote cijfers en kaarttitels (via de font-display-utility) — Inter blijft
// voor de rest. Niet gebruiken in e-mails, nieuwsbrief en embeds met
// ?thema=website (zie lib/fonts/openSans.ts voor dat laatste).
export const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});
