import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  // `*.dev.tsx` routes (/dev/cards, /dev/mascot) exist under `next dev` and on Vercel *preview*
  // deployments (VERCEL_ENV=preview, behind Vercel's login), so new cards can be tried on a phone.
  // Production builds (VERCEL_ENV=production, or any local `next build`) never compile them.
  const devRoutes = phase === PHASE_DEVELOPMENT_SERVER || process.env.VERCEL_ENV === "preview";
  return {
    reactStrictMode: true,
    pageExtensions: devRoutes ? ["dev.tsx", "tsx", "ts", "jsx", "js"] : ["tsx", "ts", "jsx", "js"],
    // Let phones and other devices on the local network use `npm run dev`. Next blocks dev
    // resources (scripts, hot reload) for any host except localhost unless it's listed here.
    // Dev-server only; production ignores it. Covers the private IPv4 ranges and .local names.
    allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
    // The certificate PDF renderer brings its own React reconciler; load it from node_modules at
    // runtime instead of bundling it into the server (React) layer.
    serverExternalPackages: ["@react-pdf/renderer"],
  };
}
