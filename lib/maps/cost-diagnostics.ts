type Counter = "mapMounts" | "mapInstancesSeen" | "geocodingRequests" |
  "geocodingShared" | "autocompleteRequests" | "autocompleteSelections";
type Counts = Record<Counter, number>;

const empty = (): Counts => ({
  mapMounts: 0, mapInstancesSeen: 0, geocodingRequests: 0,
  geocodingShared: 0, autocompleteRequests: 0, autocompleteSelections: 0,
});
let counts = empty();
let bySurface: Record<string, Counts> = {};
let seen = new WeakSet<object>();

declare global {
  interface Window {
    __mapCostDiagnostics?: {
      snapshot: () => { totals: Counts; bySurface: Record<string, Counts> };
      reset: () => void;
    };
  }
}

const enabled = () => typeof window !== "undefined" && (
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_MAP_COST_DIAGNOSTICS === "true"
);

export function countMapCost(counter: Counter, surface: string) {
  if (!enabled()) return;
  window.__mapCostDiagnostics ??= {
    snapshot: () => ({ totals: { ...counts }, bySurface: structuredClone(bySurface) }),
    reset: () => { counts = empty(); bySurface = {}; seen = new WeakSet(); },
  };
  counts[counter] += 1;
  (bySurface[surface] ??= empty())[counter] += 1;
}

export function observeMapInstance(map: object, surface: string) {
  if (!enabled()) return;
  countMapCost("mapMounts", surface);
  if (seen.has(map)) return;
  seen.add(map);
  countMapCost("mapInstancesSeen", surface);
}
