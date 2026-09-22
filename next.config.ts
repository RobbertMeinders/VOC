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
  },
};

export default nextConfig;
