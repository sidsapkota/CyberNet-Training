"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { XIcon } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth/AuthProvider";
import { EASE_OUT_QUICK } from "@/lib/motion";
import { ProLockedMessage } from "./ProLocked";

/**
 * The gentle upgrade sheet for a Pro lesson on the course path: a native modal <dialog> (focus
 * moves in and back, Escape and the close button dismiss it), a bottom sheet on phones and a
 * centred card on wider screens. Guests are asked to sign in first. No pressure, no urgency.
 */
export function UpgradeSheet({ title, open, onClose }: { title: string; open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const reduceMotion = useReducedMotion();
  const { auth } = useAuth();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="upgrade-sheet-title"
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop (outside the sheet) closes it.
        if (event.target === ref.current) onClose();
      }}
      className="m-0 mt-auto w-full max-w-none bg-transparent p-0 backdrop:bg-canvas/80 sm:m-auto sm:max-w-md"
    >
      {open && (
        <motion.div
          initial={reduceMotion ? false : { y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.25, ease: EASE_OUT_QUICK }}
          className="relative rounded-t-card border border-line-strong bg-surface px-gutter pt-8 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-lift sm:rounded-card sm:px-6 sm:pb-6"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-2 right-2 grid size-11 place-items-center rounded-control text-ink-muted hover:text-ink"
          >
            <XIcon className="size-5" />
          </button>
          <span id="upgrade-sheet-title" className="sr-only">
            {title}: part of CyberNet Pro
          </span>
          <ProLockedMessage title={title} reason={auth.status === "signed-in" ? "pro" : "sign-in"} headingLevel={2} compact />
        </motion.div>
      )}
    </dialog>
  );
}
