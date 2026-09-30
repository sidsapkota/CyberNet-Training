import type { Metadata } from "next";
import { DevCardsPlayground } from "@/dev/DevCardsPlayground";

// Dev-only route: the `.dev.tsx` extension is only registered under `next dev` (next.config.ts).
export const metadata: Metadata = {
  title: "Card playground (dev)",
  robots: { index: false, follow: false },
};

export default function DevCardsPage() {
  return <DevCardsPlayground />;
}
