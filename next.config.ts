import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't let `next dev` regenerate AGENTS.md/CLAUDE.md on every run.
  agentRules: false,
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
