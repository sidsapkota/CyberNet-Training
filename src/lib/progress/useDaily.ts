"use client";

import { useEffect, useState } from "react";
import { browserTimeZone } from "./daily";
import { useProgress } from "./ProgressProvider";
import { type DailyStatus, dailyStatus } from "./streak";

/**
 * Today's goal progress and the streak, from the current progress (null until it loads). Re-checks
 * every minute so the day rolls over at midnight without a reload. Only renders after progress
 * loads, so reading the clock can't cause a hydration mismatch.
 */
export function useDaily(): DailyStatus | null {
  const { snapshot } = useProgress();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return snapshot ? dailyStatus(snapshot, now, browserTimeZone()) : null;
}
