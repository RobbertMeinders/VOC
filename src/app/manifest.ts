import type { MetadataRoute } from "next";
import { getAppSettings } from "@/lib/settings/app-settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { site_name: siteName, org_name: orgName } = await getAppSettings();
  return {
    // name is de volledige naam (bv. bij "App-info" op Android); short_name
    // is wat onder het icoon op het beginscherm past -- tot nu toe allebei
    // siteName, waardoor pushmeldingen als afzender ook de korte naam
    // toonden i.p.v. de volledige verenigingsnaam.
    name: orgName,
    short_name: siteName,
    description: `Het besloten ledenportaal van de ${orgName}.`,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    // Redesign-besluit 3/fase 1 (docs/redesign-ontwerp.md): donkerpetrol.
    theme_color: "#0B2E33",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
