import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Client-side router cache: how long the rendered RSC payload for a
    // route stays usable on back/forward + Link navigation.
    // Dynamic pages default to 0 (no cache) in Next 15 — so every
    // navigation does a server roundtrip. Bumping to 60s makes
    // back/forward and tab-switching feel instant within a session.
    staleTimes: {
      dynamic: 60,
      static: 180,
    },
  },
  images: {
    // Google account avatars (signed in via OAuth). Allows next/image
    // optimization on the avatar shown in TopNav and /me.
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

export default nextConfig;
