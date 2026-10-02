"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { NetworkMark } from "@/components/network/NetworkMark";
import { XIcon } from "@/components/ui/icons";

// Loaded only when tapped (~265 KB of 3D code): never on the first screen of a lesson.
const Phone3D = dynamic(() => import("./Phone3D"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[340px] place-items-center rounded-card bg-screen">
      <NetworkMark mode="loading" className="size-14" />
    </div>
  ),
});

/**
 * "See it in 3D" on the phone explore card: a small button on the scene panel that opens the 3D
 * phone (spin it, pull it apart, tap a part) full screen. Optional: the lesson never needs it.
 */
export function See3D() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button
        type="button"
        data-keyboard-passthrough
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-sm px-2 text-caption font-semibold text-screen-accent hover:underline"
      >
        See it in 3D
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="The phone in 3D" className="fixed inset-0 z-50 overflow-y-auto bg-canvas px-gutter py-4">
          <div className="mx-auto max-w-lesson">
            <div className="flex justify-end">
              <button type="button" onClick={() => setOpen(false)} aria-label="Close 3D view" className="grid size-11 place-items-center rounded-control text-ink-muted hover:bg-surface-raised">
                <XIcon className="size-5" />
              </button>
            </div>
            <Phone3D />
          </div>
        </div>
      )}
    </>
  );
}
