import { useMap } from "@vis.gl/react-google-maps";
import { useEffect, useRef } from "react";

// ─── Geolocation on load ──────────────────────────────────────────────────────
export function GeolocationOnLoad({
  onLocation,
  shouldPan = true,
}: {
  onLocation: (pos: { lat: number; lng: number }) => void;
  shouldPan?: boolean;
}) {
  const map = useMap();
  const latest = useRef({ onLocation, shouldPan });
  latest.current = { onLocation, shouldPan };

  useEffect(() => {
    if (!map) return;
    let cancelled = false;
    const controller = new AbortController();

    const handleSuccess = (pos: GeolocationPosition) => {
      if (cancelled) return;
      const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (latest.current.shouldPan) {
        map.panTo(location);
      }
      latest.current.onLocation(location);
    };

    const handleFallback = async () => {
      try {
        const timer = setTimeout(() => controller.abort(), 2500);
        const response = await fetch("https://ipapi.co/json/", {
          signal: controller.signal,
        });
        clearTimeout(timer);
        const data = await response.json();
        if (!cancelled && Number.isFinite(data.latitude) && Number.isFinite(data.longitude)) {
          const location = { lat: data.latitude, lng: data.longitude };
          if (latest.current.shouldPan) {
            map.panTo(location);
          }
          latest.current.onLocation(location);
        }
      } catch (error) {
        // Silently catch abort or network failures
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        (error) => {
          handleFallback();
        },
        {
          timeout: 3000,
          maximumAge: 120000,
          enableHighAccuracy: false,
        },
      );
    } else {
      handleFallback();
    }
    return () => { cancelled = true; controller.abort(); };
  }, [map]);

  return null;
}
