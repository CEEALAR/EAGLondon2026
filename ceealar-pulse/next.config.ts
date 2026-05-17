import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // node-ical → rrule uses BigInt literals (5n) which break when webpack bundles them.
  // Mark them as external so Next.js loads the actual Node.js modules at runtime.
  serverExternalPackages: ["node-ical", "rrule"],
};

export default nextConfig;
