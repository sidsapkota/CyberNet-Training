import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomePage } from "@/components/landing/HomePage";
import { cleanSource } from "@/lib/analytics";

/**
 * Tagged links for videos: cybernettraining.com/from/tiktok shows the home page, and Vercel's page
 * views then say which platform sent people (free on every plan). The source is remembered for
 * this tab's custom events too. Never indexed: the canonical page is `/`.
 */
export const metadata: Metadata = { alternates: { canonical: "/" }, robots: { index: false, follow: true } };

export function generateStaticParams() {
  return ["tiktok", "youtube", "instagram"].map((platform) => ({ platform }));
}

export default async function FromPlatform({ params }: PageProps<"/from/[platform]">) {
  const { platform } = await params;
  if (!cleanSource(platform)) notFound();
  return <HomePage />;
}
