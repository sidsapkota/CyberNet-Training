"use client";

import { useEffect, useState } from "react";
import { browserTimeZone } from "./daily";
import { usePro } from "@/lib/pro/ProProvider";
import { useProgress } from "./ProgressProvider";
import { type DailyStatus, dailyStatus } from "./streak";

/**
 * Today's goal progress and the streak, from the current progress (null until it loads). Re-checks
 * every minute so the day rolls over at midnight without a reload. Only renders after progress
 * loads, so reading the clock can't cause a hydration mismatch.
 */
export function useDaily(): (DailyStatus & { maxFreezes: number }) | null {
  const { snapshot } = useProgress();
  // Pro holds one more streak freeze, day by day.
  const { maxFreezesOn } = usePro();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return snapshot ? dailyStatus(snapshot, now, browserTimeZone(), maxFreezesOn) : null;
}
