"use client";

import { useEffect, useEffectEvent } from "react";

/** Elements that always own their keyboard input. */
const NATIVE_SELECTOR = "a, input, textarea, select, [contenteditable]";

/**
 * The element most recently pressed with a mouse/finger, cleared on Tab. Lets us
 * tell "focused by clicking" apart from "focused by keyboard navigation".
 * (`:focus-visible` can't: any key press flips it on before our handler runs.)
 */
let pointerTarget: Element | null = null;
if (typeof window !== "undefined") {
  window.addEventListener(
    "pointerdown",
    (e) => {
      pointerTarget = e.target instanceof Element ? e.target : null;
    },
    true,
  );
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Tab") pointerTarget = null;
    },
    true,
  );
}

/**
 * Global shortcuts ignore key presses that start inside elements owning their
 * own keyboard handling. Add `data-keyboard-passthrough` to opt a region out
 * (e.g. a drag list where Space/Enter pick items up). Such regions only claim
 * keys when reached by keyboard: after clicking inside one, Enter still goes to
 * the main action, as learners expect.
 */
export function isPassthroughTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  // Opt-in for single-answer text fields: Enter submits (runs Check) instead of being swallowed.
  if (target.closest("[data-enter-submits]")) return false;
  if (target.closest(NATIVE_SELECTOR)) return true;
  const region = target.closest("[data-keyboard-passthrough]");
  if (!region) return false;
  return !(pointerTarget && region.contains(pointerTarget));
}

function hasModifier(e: KeyboardEvent) {
  return e.altKey || e.ctrlKey || e.metaKey;
}

/** Listens for keydown on the window while `enabled`. Ignores modified keys and passthrough targets. */
export function useGlobalKeyDown(handler: (event: KeyboardEvent) => void, enabled = true) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing || hasModifier(event)) return;
    if (isPassthroughTarget(event.target)) return;
    handler(event);
  });

  useEffect(() => {
    if (!enabled) return;
    // Capture phase so Enter on a focused button runs our action instead of clicking it.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled]);
}

/** Maps "1".."9" to 0-based indexes; returns null for anything else or out of range. */
export function digitKeyIndex(key: string, count: number): number | null {
  if (!/^[1-9]$/.test(key)) return null;
  const index = Number(key) - 1;
  return index < count ? index : null;
}

/**
 * Alt + Left / Alt + Right: back and forward between cards. The browser's own "history back" on
 * Alt + Left is cancelled while a lesson is open, so the learner never leaves by accident. Ignored
 * in text boxes, where Alt + arrows can mean something else.
 */
export function useCardNavigationKeys(onBack: (() => void) | null, onForward: (() => void) | null, enabled = true) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    event.preventDefault();
    if (event.key === "ArrowLeft") onBack?.();
    else onForward?.();
  });

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled]);
}
