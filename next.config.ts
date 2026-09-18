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
  },
};

export default nextConfig;
