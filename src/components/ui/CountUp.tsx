"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect } from "react";

/** Counts up from 0 to `value`. Under reduced motion, MotionConfig makes this instant. */
export function CountUp({ value, delay = 0.5, className = "" }: { value: number; delay?: number; className?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(count, value, { duration: 0.8, delay, ease: "easeOut" });
    return () => controls.stop();
  }, [count, value, delay]);

  return <motion.span className={className}>{rounded}</motion.span>;
}
