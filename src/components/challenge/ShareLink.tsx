"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CopyIcon, ShareIcon } from "@/components/ui/icons";

/**
 * The challenge link: the phone's share sheet where there is one, and Copy. The link carries only
 * the challenge id; the page shows nothing but the challenger's username and avatar.
 */
export function ShareLink({ id, lessonTitle, score, total, className = "" }: { id: string; lessonTitle: string; score: number; total: number; className?: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? `/c/${id}` : new URL(`/c/${id}`, window.location.origin).toString();
  const text = `I got ${score}/${total} on ${lessonTitle}. Can you beat me?`;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {canShare && (
        <Button onClick={() => void navigator.share({ title: "CyberNet challenge", text, url }).catch(() => {})}>
          <ShareIcon className="size-5" /> Send the challenge
        </Button>
      )}
      <Button variant={canShare ? "secondary" : "primary"} onClick={() => void copy()}>
        <CopyIcon className="size-5" /> {copied ? "Link copied" : "Copy link"}
      </Button>
      <p className="font-mono text-caption break-all text-ink-faint">{url}</p>
      <p role="status" className="sr-only">
        {copied ? "Link copied" : ""}
      </p>
    </div>
  );
}
