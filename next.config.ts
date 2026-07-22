import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Standalone Climb prototype retired — Ascent lives at /ascent (?body=thumb|flight).
  async redirects() {
    return [{ source: "/circuit-lite", destination: "/ascent", permanent: true }];
  },
};

export default nextConfig;
