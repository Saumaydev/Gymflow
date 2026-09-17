import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // Keep the client router cache warm so panel-to-panel navigation is instant.
  experimental: {
    staleTimes: { dynamic: 60, static: 300 },
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
