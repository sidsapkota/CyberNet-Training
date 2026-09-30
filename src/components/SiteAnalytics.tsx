"use client";

import { Analytics } from "@vercel/analytics/next";
import { useEffect } from "react";
import { redactUrl, rememberSource } from "@/lib/analytics";

/** Vercel Web Analytics (no cookies), with URLs redacted, plus remembering where this visit came from. */
export function SiteAnalytics() {
  useEffect(() => rememberSource(window.location.pathname, window.location.search), []);
  return (
    <Analytics
      beforeSend={(event) => {
        const url = redactUrl(event.url);
        return url ? { ...event, url } : null;
      }}
    />
  );
}
