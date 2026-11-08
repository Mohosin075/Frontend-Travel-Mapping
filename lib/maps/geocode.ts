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
  if (existing) return existing;

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
