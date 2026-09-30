import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't let `next dev` regenerate AGENTS.md/CLAUDE.md on every run.
  agentRules: false,
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Alles BEHALVE /embed en /api/embed — die moeten juist wél in een
        // iframe op de publieke WordPress-site kunnen laden (zie
        // README "WordPress-embed"). De rest van de app (ingelogde
        // portaalpagina's, login) hoort nooit in andermans iframe: zonder
        // deze header kon een kwaadwillende site het portaal onzichtbaar
        // over eigen knoppen leggen (clickjacking) om een ingelogd lid
        // bv. per ongeluk op "Account verwijderen" te laten klikken.
        source: "/((?!embed(?:/|$)|api/embed(?:/|$)).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Deze twee beperken niets aan framebaarheid, dus gelden overal,
        // óók op /embed: HSTS dwingt HTTPS af (geen reden om dat ooit uit
        // te zetten), en Permissions-Policy schakelt browser-API's uit die
        // de app nergens gebruikt (camera/microfoon/locatie — de kaart op
        // de bedrijvenpagina toont alleen het adres dat het lid zelf heeft
        // ingevuld, geen navigator.geolocation).
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      // Default is 1MB, too small for a phone photo. Match the largest
      // upload we accept (feed attachments, 15MB) with some headroom.
      bodySizeLimit: "20mb",
    },
  },
  images: {
    // NOODMAATREGEL: alle afbeeldingen kwamen ineens corrupt binnen — zelfs
    // een gloednieuwe upload met een gloednieuwe, unieke signed URL (die
    // onmogelijk door een oude cache getroffen kan zijn). Dat wijst op
    // Next.js' eigen optimizer-stap (resize/herformattering via sharp/wasm)
    // die zelf kapotte output produceert, niet op de bron-afbeelding of de
    // URL. Optimalisatie hier volledig uit i.p.v. per-<Image> `unoptimized`
    // overal los toevoegen — herstelt in elk geval het tonen van
    // afbeeldingen terwijl de echte oorzaak van de optimizer-storing verder
    // wordt uitgezocht. TODO: root cause vinden en optimalisatie terugzetten.
    unoptimized: true,
    remotePatterns: [
      // Supabase Storage (avatars, company logos, feed media)
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/**" },
    ],
    // Signed storage URLs are now cached server-side for 30 min (see
    // src/lib/supabase/storage.ts) instead of getting a fresh, unique token
    // on every request — matching the optimizer's own cache TTL to that
    // means a re-optimized image is actually reused instead of the default
    // 60s minimum throwing most of that away.
    minimumCacheTTL: 1800,
    // Profiel-/bedrijfslogo's mogen nu ook SVG zijn (zie uploadImage) — de
    // optimizer weigert SVG's standaard (kunnen scripts bevatten); de CSP +
    // attachment-disposition hieronder zijn Next.js' eigen aanbevolen manier
    // om dat toch veilig toe te staan (geen scriptuitvoering, geen inline-render).
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
