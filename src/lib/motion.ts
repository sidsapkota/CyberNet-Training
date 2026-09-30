/**
 * Shared motion settings (see CLAUDE.md → Brand → Motion). Springs with a small overshoot are
 * allowed only for presses, hovers and popovers; feedback animations stay unchanged.
 */

/** Press and hover on nodes, buttons and cards. Damping ratio ≈ 0.64, about 7% overshoot. */
export const PRESS_SPRING = { type: "spring", stiffness: 520, damping: 26, mass: 0.8 } as const;

/** Popovers opening from their trigger. */
export const POPOVER_SPRING = { type: "spring", stiffness: 420, damping: 26 } as const;

/** The brand easing, `ease-out-quick`, for entrances and fills. */
export const EASE_OUT_QUICK = [0.22, 1, 0.36, 1] as const;

/** Delay for the i-th item of a staggered entrance, capped so long lists don't drag. */
export function staggerDelay(index: number, step = 0.04, max = 0.5): number {
  return Math.min(index * step, max);
}
