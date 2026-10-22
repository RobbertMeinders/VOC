import type { Metadata } from "next";
import { NotificatiesPageContent } from "@/components/notifications/NotificatiesPageContent";

export const metadata: Metadata = { title: "Meldingen" };

// Punt 9: inhoud zit nu in NotificatiesPageContent, gedeeld met de
// overlay-variant (@modal/(.)notificaties) -- zelfde opzet als
// testfase/page.tsx + @modal/(.)testfase.
export default async function NotificatiesPage() {
  return <NotificatiesPageContent />;
}
