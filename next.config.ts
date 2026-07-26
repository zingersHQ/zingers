import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

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

export default withNextIntl(nextConfig);
