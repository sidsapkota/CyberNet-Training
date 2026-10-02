import type { Metadata } from "next";
import { HeroPlayground } from "@/dev/hero/HeroPlayground";

// Dev-only route: the `.dev.tsx` extension is only registered under `next dev` and on Vercel
// previews (next.config.ts), so the 3D, physics and gesture code never reaches production.
export const metadata: Metadata = {
  title: "Hero interactions (dev)",
  robots: { index: false, follow: false },
};

export default function DevHeroPage() {
  return <HeroPlayground />;
}
