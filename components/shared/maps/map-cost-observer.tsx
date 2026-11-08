"use client";

import { useMap } from "@vis.gl/react-google-maps";
import { useEffect } from "react";
import { observeMapInstance } from "@/lib/maps/cost-diagnostics";

export function MapCostObserver({ surface }: { surface: string }) {
  const map = useMap();
  useEffect(() => {
    if (map) observeMapInstance(map, surface);
  }, [map, surface]);
  return null;
}
