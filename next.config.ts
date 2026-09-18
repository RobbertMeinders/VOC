import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't let `next dev` regenerate AGENTS.md/CLAUDE.md on every run.
  agentRules: false,
  images: {
    remotePatterns: [
      // Supabase Storage (avatars, company logos, feed media)
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/**" },
    ],
  },
};

export default nextConfig;
