import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { Providers } from "@/components/Providers";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import { THEME_INIT_SCRIPT } from "@/components/ui/theme-script";
import { HOME_SCRIPT } from "@/lib/home";
import { isIndexable, SITE_NAME, SITE_TAGLINE, siteUrl } from "@/lib/site";
import "./globals.css";

// Self-hosted at build time by next/font: no runtime requests to Google, no layout shift.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: `${SITE_NAME}: learn how tech really works`, template: `%s · ${SITE_NAME}` },
  description: SITE_TAGLINE,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_AU", url: "/" },
  twitter: { card: "summary_large_image" },
  // Previews and local dev are never indexed (production is decided in robots.ts too).
  robots: isIndexable() ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#061630" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Applies a saved light/dark choice before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Marks returning learners before first paint, so `/` shows the dashboard, not the landing page. */}
        <script dangerouslySetInnerHTML={{ __html: HOME_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
        <SiteAnalytics />
      </body>
    </html>
  );
}
