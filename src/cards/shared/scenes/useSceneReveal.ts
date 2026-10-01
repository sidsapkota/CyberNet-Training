import { useReducedMotion } from "motion/react";
import { useCallback, useRef } from "react";

/**
 * After a tap on a scene, makes sure the whole scene panel (and so its pinned callout) is in view:
 * scrolls it the least amount needed, clear of the player's sticky header and footer (the panel's
 * scroll margins). Instant under reduced motion.
 */
export function useSceneReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const reveal = useCallback(() => {
    // After the callout has rendered, so the measurement includes it.
    window.requestAnimationFrame(() => ref.current?.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" }));
  }, [reduceMotion]);
  return { ref, reveal };
}
