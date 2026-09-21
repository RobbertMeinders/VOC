import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme/constants";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

// Speeds up the first avatar/logo/attachment image on any page — a plain
// string builder, not requireEnv(), so a missing env var never breaks the
// whole app's static prerendering over one <link> tag.
const supabaseStorageOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL;

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "VOC Ledenportaal",
    template: "%s | VOC Ledenportaal",
  },
  description: "Het besloten ledenportaal van de Veendammer OndernemersCompagnie.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VOC Ledenportaal",
  },
};

export const viewport: Viewport = {
  themeColor: "#e8000f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Zonder dit blijft de layout-viewport op Android/Chrome even groot als het
  // toetsenbord opent — een `fixed`/gecentreerde overlay (zoeken, nieuw
  // bericht) komt dan half achter het toetsenbord te zitten i.p.v. dat de
  // pagina meekrimpt.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nl" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {supabaseStorageOrigin && <link rel="preconnect" href={supabaseStorageOrigin} crossOrigin="anonymous" />}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
