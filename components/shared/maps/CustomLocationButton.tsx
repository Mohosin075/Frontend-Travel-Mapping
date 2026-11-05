"use client";

import { ControlPosition, MapControl, useMap } from "@vis.gl/react-google-maps";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export const CustomLocationButton = ({
  onLocated,
  label,
}: {
  onLocated?: (lat: number, lng: number) => void;
  label?: string;
} = {}) => {
  const { t } = useLanguage();
  const displayLabel = label || t("map.use_my_location");
  const map = useMap();
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);
  const requestId = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; requestId.current++; };
  }, []);

  const handleLocationClick = useCallback(() => {
    if (loading) return;

    setLoading(true);
    const request = ++requestId.current;
    const isCurrent = () => mounted.current && requestId.current === request;

    const panAndLocate = (lat: number, lng: number, zoom = 16) => {
      if (!isCurrent()) return;
      if (map) {
        map.setCenter({ lat, lng });
        map.setZoom(zoom);
      }
      onLocated?.(lat, lng);
      setLoading(false);
    };

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLoading(false);
      toast.error(t("map.location_not_supported"));
      return;
    }

    let settled = false; // prevent double-resolve

    // ── Strategy: Show fast (low-accuracy), silently improve if better GPS arrives ──

    // 1. Fast attempt: low-accuracy, short timeout (usually resolves in <2s on WiFi/laptop)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!isCurrent() || settled) return;
        settled = true;
        panAndLocate(pos.coords.latitude, pos.coords.longitude, 16);

        // 2. Silently try to improve accuracy in background (no extra loading state)
        if (pos.coords.accuracy > 200) {
          navigator.geolocation.getCurrentPosition(
            (pos2) => {
              if (!isCurrent()) return;
              if (pos2.coords.accuracy < pos.coords.accuracy) {
                // Better result — update map silently without spinner
                if (map) {
                  map.setCenter({ lat: pos2.coords.latitude, lng: pos2.coords.longitude });
                }
                onLocated?.(pos2.coords.latitude, pos2.coords.longitude);
              }
            },
            () => { /* silent — already showing first result */ },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
          );
        }
      },
      () => {
        // Fast attempt failed (permission denied or unavailable)
        if (!isCurrent() || settled) return;

        // 3. Try once more with high accuracy before giving up
        navigator.geolocation.getCurrentPosition(
          (pos2) => {
            if (!isCurrent() || settled) return;
            settled = true;
            panAndLocate(pos2.coords.latitude, pos2.coords.longitude, 16);
          },
          (err) => {
            if (!isCurrent() || settled) return;
            settled = true;
            const isBlocked = err.code === err.PERMISSION_DENIED;
            // 4. IP geolocation fallback
            fetch("https://ipwho.is/")
              .then((r) => r.json())
              .then((data) => {
                if (!isCurrent()) return;
                if (data?.success && data.latitude && data.longitude) {
                  panAndLocate(data.latitude, data.longitude, 13);
                  toast.warning(
                    isBlocked
                      ? t("map.location_blocked", "Location blocked. Showing approximate area — allow location in browser for exact GPS.")
                      : t("map.location_approximate", "Could not get GPS. Showing approximate area based on your internet connection."),
                    { duration: 5000 }
                  );
                } else {
                  throw new Error("ipwho failed");
                }
              })
              .catch(() => {
                if (!isCurrent()) return;
                return fetch("https://ipapi.co/json/")
                  .then((r) => r.json())
                  .then((data) => {
                    if (!isCurrent()) return;
                    if (data?.latitude && data.longitude) {
                      panAndLocate(data.latitude, data.longitude, 13);
                      toast.warning(
                        isBlocked
                          ? t("map.location_blocked", "Location blocked. Showing approximate area — allow location in browser for exact GPS.")
                          : t("map.location_approximate", "Could not get GPS. Showing approximate area based on your internet connection."),
                        { duration: 5000 }
                      );
                    } else {
                      throw new Error("ipapi failed");
                    }
                  });
              })
              .catch(() => {
                if (!isCurrent()) return;
                setLoading(false);
                toast.error(t("map.unable_to_get_location"));
              });
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      },
      // Fast first attempt: low accuracy, very short timeout
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 30000 }
    );
  }, [map, onLocated, loading, t]);

  return (
    <MapControl position={ControlPosition.RIGHT_BOTTOM}>
      <button
        type="button"
        onClick={handleLocationClick}
        disabled={loading}
        className="m-3 flex items-center gap-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] px-3 py-2.5 shadow-xl transition hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50"
        title={displayLabel}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-gray-700 dark:text-slate-200 ${loading ? "animate-spin" : ""}`}
        >
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="2" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="2" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="22" y2="12" />
        </svg>
        {displayLabel ? (
          <span className="hidden text-xs font-semibold text-gray-700 dark:text-slate-200 sm:inline">
            {displayLabel}
          </span>
        ) : null}
      </button>
    </MapControl>
  );
};
