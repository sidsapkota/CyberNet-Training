"use client";

import { OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Mesh } from "three";
import { Button } from "@/components/ui/Button";
import { useFeedback } from "@/lib/feedback";
import { buzz, looksSlow, markReady, play, prefersReducedMotion, tokenColor } from "./juice";

/** The parts, back to front, with their one-line jobs (the same as the explore cards). */
const PARTS = [
  { id: "back", name: "Back cover", job: "Protects the inside. On phones it's glued on.", size: [1.62, 3.22, 0.06], at: [0, 0, -0.2], spread: -1.1, tone: "scene-edge" },
  { id: "battery", name: "Battery", job: "Stores the energy that powers everything.", size: [1.25, 1.85, 0.12], at: [0, -0.5, -0.1], spread: -0.55, tone: "scene-heat" },
  { id: "board", name: "Main board", job: "Connects every part, so they can work together.", size: [1.3, 1.0, 0.05], at: [0, 1.0, -0.05], spread: 0, tone: "success" },
  { id: "cpu", name: "Processor (CPU)", job: "Follows instructions: it does the thinking.", size: [0.34, 0.34, 0.06], at: [-0.32, 1.05, 0.01], spread: 0.35, tone: "scene-part" },
  { id: "ram", name: "Memory (RAM)", job: "Holds the apps you have open right now.", size: [0.3, 0.22, 0.06], at: [0.15, 1.18, 0.01], spread: 0.45, tone: "scene-part" },
  { id: "storage", name: "Storage", job: "Keeps your photos and apps, even when it's off.", size: [0.3, 0.22, 0.06], at: [0.15, 0.86, 0.01], spread: 0.55, tone: "scene-part" },
  { id: "camera", name: "Camera", job: "Turns light into a picture.", size: [0.28, 0.28, 0.1], at: [-0.48, 1.36, -0.12], spread: -0.8, tone: "on-screen" },
  { id: "screen", name: "Screen", job: "Shows the picture and feels your touch.", size: [1.62, 3.22, 0.05], at: [0, 0, 0.12], spread: 1.1, tone: "scene-panel" },
] as const;
type PartId = (typeof PARTS)[number]["id"];

function Part({ part, exploded, selected, reduce, colors, onPick }: {
  part: (typeof PARTS)[number];
  exploded: boolean;
  selected: boolean;
  reduce: boolean;
  colors: Record<string, string>;
  onPick: (id: PartId) => void;
}) {
  const ref = useRef<Mesh>(null);
  const target = part.at[2] + (exploded ? part.spread : 0);
  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    // A critically damped ease toward the target: quick, no wobble.
    mesh.position.z = reduce ? target : mesh.position.z + (target - mesh.position.z) * Math.min(1, dt * 9);
  });
  const color = selected ? colors.accent : colors[part.tone];
  const props = {
    ref,
    position: [part.at[0], part.at[1], part.at[2]] as [number, number, number],
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onPick(part.id);
    },
  };
  const rounded = part.id === "back" || part.id === "screen" || part.id === "battery";
  return rounded ? (
    <RoundedBox args={part.size as unknown as [number, number, number]} radius={0.12} smoothness={3} {...props}>
      <meshStandardMaterial color={color} roughness={0.55} metalness={0.15} emissive={selected ? colors.accent : "#000"} emissiveIntensity={selected ? 0.25 : 0} />
    </RoundedBox>
  ) : (
    <mesh {...props}>
      <boxGeometry args={part.size as unknown as [number, number, number]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} emissive={selected ? colors.accent : "#000"} emissiveIntensity={selected ? 0.3 : 0} />
    </mesh>
  );
}

/** The still version: slow devices, reduced motion, no WebGL. Parts stacked as a 2D diagram. */
function Fallback({ selected, onPick }: { selected: PartId | null; onPick: (id: PartId) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-card bg-screen p-3">
      {PARTS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onPick(p.id)}
          className={`min-h-11 rounded-control border-2 px-3 py-2 text-left text-small text-on-screen ${selected === p.id ? "border-screen-accent" : "border-screen-line"}`}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}

export default function Phone3D() {
  const reduce = useReducedMotion() ?? false;
  const feedback = useFeedback();
  const [exploded, setExploded] = useState(false);
  const [selected, setSelected] = useState<PartId | null>(null);
  // Decided once on mount (client-only component): slow devices, reduced motion or no WebGL → 2D.
  const [mode] = useState<"3d" | "2d">(() => {
    let webgl = false;
    try {
      webgl = Boolean(document.createElement("canvas").getContext("webgl2"));
    } catch {
      webgl = false;
    }
    return prefersReducedMotion() || looksSlow() || !webgl ? "2d" : "3d";
  });
  const colors = useMemo(
    () => (mode === "3d" ? Object.fromEntries(["scene-edge", "scene-panel", "scene-heat", "success", "scene-part", "on-screen", "accent"].map((t) => [t, tokenColor(t)])) : {}),
    [mode],
  );

  useEffect(() => {
    if (mode === "2d") markReady(prefersReducedMotion() ? "reduced-motion" : "slow-or-no-webgl");
  }, [mode]);

  const pick = (id: PartId) => {
    setSelected(id);
    play("snap", feedback.enabled);
  };
  const info = PARTS.find((p) => p.id === selected);

  return (
    <section aria-label="3D phone" className="space-y-3">
      <p className="text-lead font-semibold">Spin the phone, then pull it apart.</p>
      {mode === "3d" ? (
        <div className="h-[340px] touch-none overflow-hidden rounded-card bg-screen">
          <Canvas camera={{ position: [2.6, 1.2, 4.4], fov: 40 }} dpr={[1, 2]} onCreated={() => markReady()}>
            <ambientLight intensity={1.6} />
            <hemisphereLight args={[colors["on-screen"], colors["scene-panel"], 1.2]} />
            <directionalLight position={[3, 4, 5]} intensity={2.2} />
            <group rotation={[0, -0.5, 0]}>
              {PARTS.map((p) => (
                <Part key={p.id} part={p} exploded={exploded} selected={selected === p.id} reduce={reduce} colors={colors} onPick={pick} />
              ))}
            </group>
            <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={0.8} />
          </Canvas>
        </div>
      ) : (
        <Fallback selected={selected} onPick={pick} />
      )}
      {mode === "3d" && (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            setExploded((v) => !v);
            play("whoosh", feedback.enabled);
            buzz(reduce);
          }}
        >
          {exploded ? "Put it back together" : "Pull apart"}
        </Button>
      )}
      <p aria-live="polite" className="min-h-12 text-body">
        {info ? (
          <>
            <strong>{info.name}:</strong> {info.job}
          </>
        ) : (
          <span className="text-ink-muted">Tap a part to see what it does.</span>
        )}
      </p>
    </section>
  );
}
