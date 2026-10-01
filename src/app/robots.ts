import type { MetadataRoute } from "next";
import { absoluteUrl, isIndexable } from "@/lib/site";

/** Production allows the public pages; previews and local dev block everything. */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexable()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dev/", "/account", "/auth/", "/feedback", "/from/", "/leagues"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
