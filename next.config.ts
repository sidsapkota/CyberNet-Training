import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  return {
    reactStrictMode: true,
    // `*.dev.tsx` routes (e.g. /dev/cards) only exist under `next dev`; production builds
    // never compile them.
    pageExtensions:
      phase === PHASE_DEVELOPMENT_SERVER ? ["dev.tsx", "tsx", "ts", "jsx", "js"] : ["tsx", "ts", "jsx", "js"],
    // Let phones and other devices on the local network use `npm run dev`. Next blocks dev
    // resources (scripts, hot reload) for any host except localhost unless it's listed here.
    // Dev-server only; production ignores it. Covers the private IPv4 ranges and .local names.
    allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  };
}
