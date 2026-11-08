"use client";

import { useEffect, useRef, useState } from "react";

// Wait until a map is actually visible, then keep it mounted while scrolling.
export function useMapVisibility() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setVisible(true);
      observer.disconnect();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
  return { containerRef, visible };
}
