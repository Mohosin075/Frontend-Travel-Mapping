"use client";

import { useEffect, useState } from "react";

/** Cancel scheduled polling when hidden; focus listeners still refetch on return. */
export function useVisiblePollingInterval(intervalMs: number): number {
  const [interval, setPollingInterval] = useState(intervalMs);
  useEffect(() => {
    const update = () => setPollingInterval(document.hidden ? 0 : intervalMs);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, [intervalMs]);
  return interval;
}
