import type { MetadataRoute } from "next";
import { getAppSettings } from "@/lib/settings/app-settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { site_name: siteName, org_name: orgName } = await getAppSettings();
  return {
    name: siteName,
    short_name: siteName,
    description: `Het besloten ledenportaal van de ${orgName}.`,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#e8000f",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
