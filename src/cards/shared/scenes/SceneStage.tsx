"use client";

import { type CSSProperties, type ReactNode, type Ref, useCallback, useLayoutEffect, useState } from "react";
import { SceneArt } from "./art";
import { type Box, getScene, type SceneId } from "./manifests";

/** Tallest a scene is drawn, so portrait devices (phones) fit on screen. */
const MAX_HEIGHT = 400;
/**
 * Room kept for the player around the scene (header, footer, the card's instruction line and the
 * "Simplified diagram" chip), so the whole scene fits the visible screen: at 360×640, and in the
 * Instagram browser's ~560px.
 */
const RESERVED = "17rem";

/**
 * Positions an element over a part's box, as percentages of the scene, at least 44px square so
 * it's always a comfortable tap target (small parts like screws get a larger invisible target).
 */
export function partTargetStyle(sceneId: SceneId, box: Box): CSSProperties {
  const scene = getScene(sceneId)!;
  return {
    position: "absolute",
    left: `${((box.x + box.w / 2) / scene.width) * 100}%`,
    top: `${((box.y + box.h / 2) / scene.height) * 100}%`,
    width: `max(44px, ${(box.w / scene.width) * 100}%)`,
    height: `max(44px, ${(box.h / scene.height) * 100}%)`,
    transform: "translate(-50%, -50%)",
  };
}

/** Centres an overlay (at least 44px) on a point of the scene, in viewBox units. */
export function pointTargetStyle(sceneId: SceneId, point: { x: number; y: number }): CSSProperties {
  const scene = getScene(sceneId)!;
  return {
    position: "absolute",
    left: `${(point.x / scene.width) * 100}%`,
    top: `${(point.y / scene.height) * 100}%`,
    minWidth: 44,
    minHeight: 44,
    transform: "translate(-50%, -50%)",
  };
}

/** Parts sorted for overlays: big ones first (underneath), then top-to-bottom for tab order. */
export function overlayOrder<T extends { box: Box }>(parts: readonly T[]): T[] {
  return [...parts].sort((a, b) => b.box.w * b.box.h - a.box.w * a.box.h);
}

/** The smallest a scene is drawn, even on a crowded card (a card that needs less must be split). */
const MIN_HEIGHT = 180;
/**
 * Scenes that show their own text (an email, a text message, a web page, a file list): never shrunk
 * to fit, or their words become unreadable and their parts too small to tap apart. A card using one
 * that doesn't fit must be split (the fit audit lists it).
 */
const READABLE = new Set<SceneId>(["file-browser", "email", "text-message", "fake-website"]);
/** Room kept under the scene: the page's bottom padding (the hint and Back live in the footer). */
const BELOW = 28;

/**
 * How tall the scene can be so the whole card fits the screen: from the scene's top (as laid out
 * at the top of the page) to the player's sticky footer, minus the panel's padding and chip and a
 * line below. Re-measured on resize. Null until measured (the server HTML uses a CSS estimate).
 */
function useFittedHeight(chip: boolean) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!node) return;
    const measure = () => {
      const top = node.getBoundingClientRect().top + window.scrollY;
      const footer = document.querySelector("[data-player-footer]")?.getBoundingClientRect().height ?? 0;
      const room = window.innerHeight - footer - top - 24 - (chip ? 30 : 0) - BELOW;
      setHeight(Math.round(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, room))));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [node, chip]);
  return { setNode, height };
}

/**
 * Which part a tap at (x, y) in scene units means: the smallest part whose real box contains it,
 * else the nearest within `tolerance` (scene units). Each part's button is at least 44px, so on a
 * small scene the buttons overlap (a text line's button covering the next line); this picks by
 * the drawn part instead. Pure.
 */
export function partAt(parts: readonly { id: string; box: Box }[], x: number, y: number, tolerance: number): string | null {
  const inside = parts.filter((p) => x >= p.box.x && x <= p.box.x + p.box.w && y >= p.box.y && y <= p.box.y + p.box.h);
  if (inside.length) return inside.reduce((a, b) => (a.box.w * a.box.h <= b.box.w * b.box.h ? a : b)).id;
  let best: { id: string; d: number } | null = null;
  for (const p of parts) {
    const dx = Math.max(p.box.x - x, 0, x - (p.box.x + p.box.w));
    const dy = Math.max(p.box.y - y, 0, y - (p.box.y + p.box.h));
    const d = Math.hypot(dx, dy);
    if (d <= tolerance && (!best || d < best.d)) best = { id: p.id, d };
  }
  return best?.id ?? null;
}

/** Which half of the scene a part's box is in (a callout goes in the other one). */
export function partHalf(sceneId: SceneId, box: Box): "top" | "bottom" {
  const scene = getScene(sceneId)!;
  return box.y + box.h / 2 < scene.height / 2 ? "top" : "bottom";
}

/**
 * A scene on the navy screen panel, with an overlay layer (buttons, labels) positioned over it.
 * Wide scenes fill the width; tall ones are capped in height (by 400px and by the visible screen)
 * and centred. `callout` (a tapped part's name and job, a nudge) is pinned inside the panel, on
 * the half away from the part (`calloutAt`), so it's always in view with the scene, never below
 * the fold. It never blocks a tap.
 */
export function SceneStage({
  sceneId,
  hidden,
  wrap,
  title,
  children,
  callout,
  calloutAt = "bottom",
  status,
  pick,
  ref,
}: {
  /**
   * Taps go to the drawn part under the finger (`partAt`), not to whichever 44px button is on
   * top. The parts' own buttons stay for keyboard and screen-reader users.
   */
  pick?: { parts: readonly { id: string; box: Box }[]; onPick: (id: string) => void; disabled?: boolean };
  sceneId: SceneId;
  hidden: ReadonlySet<string>;
  wrap?: (partId: string, node: ReactNode) => ReactNode;
  title?: string;
  children?: ReactNode;
  callout?: ReactNode;
  calloutAt?: "top" | "bottom";
  /** A short live status on the panel's top row, opposite the "Simplified diagram" chip (e.g. "1/4 steps"). */
  status?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}) {
  const scene = getScene(sceneId)!;
  const ratio = scene.width / scene.height;
  const fitted = useFittedHeight(scene.simplified === true || Boolean(status));
  // Wide scenes (laptop, email, web page) are short, so the callout fits below them, in view,
  // without covering the scene; tall ones (phones) pin it inside the panel instead.
  const wide = ratio >= 1.2;
  const shrink = !READABLE.has(sceneId);
  const { setNode } = fitted;
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      setNode(node);
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: HTMLDivElement | null }).current = node;
    },
    [ref, setNode],
  );
  return (
    <div ref={setRefs} data-scene-stage className="relative scroll-mt-20 scroll-mb-28 rounded-card bg-screen p-3 sm:p-4">
      {(scene.simplified || status) && (
        <div className="mb-2 flex items-center justify-between gap-2">
          {scene.simplified ? (
            <p className="w-fit rounded-sm border border-screen-line px-1.5 py-0.5 font-mono text-caption text-on-screen-muted">
              Simplified diagram
            </p>
          ) : (
            <span />
          )}
          {status}
        </div>
      )}
      <div
        className="relative mx-auto"
        style={{
          aspectRatio: `${scene.width} / ${scene.height}`,
          // Measured: the room left between the scene's top and the player's footer. Before that
          // (server HTML), a CSS estimate.
          width:
            fitted.height !== null && shrink
              ? `min(100%, ${Math.round(fitted.height * ratio)}px)`
              : !shrink
                ? `min(100%, ${Math.round(MAX_HEIGHT * ratio)}px)`
              : `min(100%, ${Math.round(MAX_HEIGHT * ratio)}px, calc((100dvh - ${RESERVED}) * ${ratio.toFixed(4)}))`,
        }}
      >
        <SceneArt sceneId={sceneId} hidden={hidden} wrap={wrap} title={title} />
        {children}
        {pick && !pick.disabled && (
          <div
            aria-hidden="true"
            data-scene-pick
            className="absolute inset-0 z-[5] cursor-pointer"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const x = ((event.clientX - rect.left) / rect.width) * scene.width;
              const y = ((event.clientY - rect.top) / rect.height) * scene.height;
              const id = partAt(pick.parts, x, y, (22 / rect.width) * scene.width);
              if (id) pick.onPick(id);
            }}
          />
        )}
      </div>
      {callout && wide && (
        <div data-scene-callout className="mt-3 min-h-16 rounded-control border border-line-strong bg-surface p-3 text-left">
          {callout}
        </div>
      )}
      {callout && !wide && (
        <div
          data-scene-callout
          className={`pointer-events-none absolute inset-x-2 z-10 rounded-control border border-line-strong bg-surface p-3 text-left shadow-lift sm:inset-x-3 ${
            calloutAt === "top" ? "top-2 sm:top-3" : "bottom-2 sm:bottom-3"
          }`}
        >
          {callout}
        </div>
      )}
    </div>
  );
}
