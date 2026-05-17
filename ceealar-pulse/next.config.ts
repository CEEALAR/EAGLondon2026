import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Client-side router cache: how long the rendered RSC payload for a
    // route stays usable on back/forward + Link navigation.
    // We previously cached dynamic routes for 60s to make tab-switching feel
    // instant, but that caused user-specific pages (/me, /attendees/[id]) to
    // serve stale data after mutations — e.g. clicking "Want to meet" then
    // tabbing to /me would still show the pre-click state. For an internal
    // coordination tool, freshness beats navigation snappiness.
    staleTimes: {
      dynamic: 0,
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
