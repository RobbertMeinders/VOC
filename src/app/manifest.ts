import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VOC Ledenportaal",
    short_name: "VOC",
    description: "Het besloten ledenportaal van de Veendammer OndernemersCompagnie.",
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
