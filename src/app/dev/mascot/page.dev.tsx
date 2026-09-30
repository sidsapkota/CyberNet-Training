import type { Metadata } from "next";
import { MascotPlayground } from "@/dev/MascotPlayground";

// Dev-only route: the `.dev.tsx` extension is only registered under `next dev` (next.config.ts).
export const metadata: Metadata = {
  title: "Mascot (dev)",
  robots: { index: false, follow: false },
};

export default function DevMascotPage() {
  return <MascotPlayground />;
}
