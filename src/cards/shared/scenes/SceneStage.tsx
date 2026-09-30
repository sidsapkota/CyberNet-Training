import type { CSSProperties, ReactNode } from "react";
import { SceneArt } from "./art";
import { type Box, getScene, type SceneId } from "./manifests";

/** Tallest a scene is drawn, so portrait devices (phones) fit on screen. */
const MAX_HEIGHT = 400;

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

/**
 * A scene on the navy screen panel, with an overlay layer (buttons, labels) positioned over it.
 * Wide scenes fill the width; tall ones are capped in height and centred.
 */
export function SceneStage({
  sceneId,
  hidden,
  wrap,
  title,
  children,
}: {
  sceneId: SceneId;
  hidden: ReadonlySet<string>;
  wrap?: (partId: string, node: ReactNode) => ReactNode;
  title?: string;
  children?: ReactNode;
}) {
  const scene = getScene(sceneId)!;
  return (
    <div className="rounded-card bg-screen p-3 sm:p-4">
      <div
        className="relative mx-auto"
        style={{
          aspectRatio: `${scene.width} / ${scene.height}`,
          width: `min(100%, ${Math.round((MAX_HEIGHT * scene.width) / scene.height)}px)`,
        }}
      >
        <SceneArt sceneId={sceneId} hidden={hidden} wrap={wrap} title={title} />
        {children}
      </div>
    </div>
  );
}
