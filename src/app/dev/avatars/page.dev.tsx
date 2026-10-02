import type { Metadata } from "next";
import { AvatarPlayground } from "@/dev/AvatarPlayground";

// Dev-only route: the `.dev.tsx` extension is only registered under `next dev` (next.config.ts).
export const metadata: Metadata = {
  title: "Avatars (dev)",
  robots: { index: false, follow: false },
};

export default function DevAvatarsPage() {
  return <AvatarPlayground />;
}
