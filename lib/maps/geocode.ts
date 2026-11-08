import { countMapCost } from "./cost-diagnostics";

type GeocodeOutcome = {
  results: google.maps.GeocoderResult[] | null;
  status: string;
};

type GeocodeLookup =
  | { address: string }
  | { placeId: string }
  | { location: google.maps.LatLngLiteral };

// Share only requests currently in progress. Do not retain Google results.
const pending = new Map<string, Promise<GeocodeOutcome>>();

export function geocodeInFlight(
  geocoder: google.maps.Geocoder,
  request: GeocodeLookup,
): Promise<GeocodeOutcome> {
  // Callers use plain address/placeId/lat-lng values, not LatLng instances.
  const key = JSON.stringify(request);
  const existing = pending.get(key);
  if (existing) {
    countMapCost("geocodingShared", "javascript");
    return existing;
  }

  countMapCost("geocodingRequests", "javascript");

  const operation = new Promise<GeocodeOutcome>((resolve, reject) => {
    const response = geocoder.geocode(request, (results, status) => resolve({ results, status }));
    // Google also returns a promise. Handle rejection even if its callback
    // never runs, so failures cannot leave a shared lookup permanently pending.
    if (response && typeof response.catch === "function") {
      void response.catch(reject);
    }
  });
  const tracked = operation.finally(() => pending.delete(key));
  pending.set(key, tracked);
  return tracked;
}
// REST callers share the JSON promise, never a Response body that can only be
// consumed once. Keep validation/address behavior at the call sites unchanged.
const pendingHttp = new Map<string, Promise<any>>();

export function fetchGeocodeJson(url: string): Promise<any> {
  const existing = pendingHttp.get(url);
  if (existing) {
    countMapCost("geocodingShared", "rest");
    return existing;
  }
  countMapCost("geocodingRequests", "rest");
  const operation = Promise.resolve().then(async () => {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Geocoding request failed");
    return response.json();
  });
  const tracked = operation.finally(() => pendingHttp.delete(url));
  pendingHttp.set(url, tracked);
  return tracked;
}
