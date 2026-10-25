"use client";

import { HIDE_GOOGLE_POI_STYLES } from "@/components/Common/maps/map";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { useTheme } from "next-themes";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Compass,
  Layers,
  MapPin,
  Navigation,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { SafeImage } from "@/components/shared/safe-image";
import { getLocalized, getUsableMediaUrl } from "@/lib/utils";
import Link from "next/link";

interface RouteStopItem {
  id: string;
  placeId: string;
  name: any;
  address: string;
  media: string[];
  coordinates: [number, number]; // [lng, lat]
  order: number;
}

interface RouteMapViewProps {
  stops: RouteStopItem[];
  selectedStopIndex?: number | null;
  onSelectStop?: (index: number) => void;
  className?: string;
  height?: string;
}

// Polyline component using Google Maps geometry/maps library
function RoutePolyline({ stops }: { stops: RouteStopItem[] }) {
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  const polylineRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !mapsLib || stops.length < 2) {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      return;
    }

    const path = stops
      .filter(
        (s) =>
          s.coordinates &&
          Number.isFinite(Number(s.coordinates[1])) &&
          Number.isFinite(Number(s.coordinates[0])) &&
          Number(s.coordinates[1]) !== 0 &&
          Number(s.coordinates[0]) !== 0
      )
      .map((s) => ({
        lat: Number(s.coordinates[1]),
        lng: Number(s.coordinates[0]),
      }));

    if (path.length < 2) return;

    try {
      if (!polylineRef.current) {
        polylineRef.current = new mapsLib.Polyline({
          path,
          geodesic: true,
          strokeColor: "#FFC107",
          strokeOpacity: 0.95,
          strokeWeight: 4,
          map,
        });
      } else {
        polylineRef.current.setPath(path);
        polylineRef.current.setMap(map);
      }
    } catch {
      // Graceful fail if maps library is not ready
    }

    return () => {
      if (polylineRef.current) {
        try {
          polylineRef.current.setMap(null);
        } catch {}
        polylineRef.current = null;
      }
    };
  }, [map, mapsLib, stops]);

  return null;
}

// Automatically fit bounds to contain all stops
function FitBoundsHandler({
  stops,
  fitTrigger,
}: {
  stops: RouteStopItem[];
  fitTrigger: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || stops.length === 0) return;

    const validStops = stops.filter(
      (s) =>
        s.coordinates &&
        Number.isFinite(Number(s.coordinates[1])) &&
        Number.isFinite(Number(s.coordinates[0])) &&
        Number(s.coordinates[1]) !== 0 &&
        Number(s.coordinates[0]) !== 0
    );

    if (validStops.length === 0) return;

    const applyBounds = () => {
      try {
        if (typeof window !== "undefined" && window.google?.maps?.event) {
          window.google.maps.event.trigger(map, "resize");
        }

        if (validStops.length === 1) {
          map.setCenter({
            lat: Number(validStops[0].coordinates[1]),
            lng: Number(validStops[0].coordinates[0]),
          });
          map.setZoom(14);
          return;
        }

        if (typeof window !== "undefined" && window.google?.maps) {
          const bounds = new window.google.maps.LatLngBounds();
          validStops.forEach((s) => {
            bounds.extend({
              lat: Number(s.coordinates[1]),
              lng: Number(s.coordinates[0]),
            });
          });

          map.fitBounds(bounds, { top: 60, right: 60, bottom: 120, left: 60 });
        }
      } catch {
        // Fallback
      }
    };

    // Apply immediately and then after small delay to handle modal rendering/resizing
    applyBounds();
    const timer = setTimeout(applyBounds, 150);
    return () => clearTimeout(timer);
  }, [map, stops, fitTrigger]);

  return null;
}

// Map Controls component (Satellite switch, Recenter)
function MapToolbar({
  stops,
  mapType,
  setMapType,
  onRecenter,
}: {
  stops: RouteStopItem[];
  mapType: string;
  setMapType: (t: string) => void;
  onRecenter: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="absolute top-2.5 sm:top-4 right-2.5 sm:right-4 z-10 flex items-center gap-1 sm:gap-1.5 bg-white/95 dark:bg-[#131b2e]/95 backdrop-blur-md p-1 sm:p-1.5 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800">
      <button
        type="button"
        onClick={() => setMapType(mapType === "hybrid" ? "roadmap" : "hybrid")}
        title={
          mapType === "hybrid"
            ? t("route_planner.map_standard") || "Mapa estándar"
            : t("route_planner.map_satellite") || "Satélite"
        }
        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
          mapType === "hybrid"
            ? "bg-[#FFC107] text-gray-950 shadow-sm"
            : "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
        }`}
      >
        <Layers className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">
          {mapType === "hybrid"
            ? t("route_planner.map_satellite") || "Satélite"
            : t("route_planner.map_standard") || "Mapa"}
        </span>
      </button>

      {stops.length > 0 && (
        <button
          type="button"
          onClick={onRecenter}
          title={t("route_planner.recenter_route") || "Centrar ruta"}
          className="p-1.5 rounded-xl text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-bold"
        >
          <Compass className="w-4 h-4 text-amber-500" />
          <span className="hidden md:inline">{t("route_planner.recenter_route") || "Centrar"}</span>
        </button>
      )}
    </div>
  );
}

// Smoothly pan map to selected active stop
function PanToActiveStopHandler({
  activeStop,
  panTrigger,
}: {
  activeStop?: RouteStopItem;
  panTrigger: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !activeStop || panTrigger === 0) return;
    const lat = Number(activeStop.coordinates?.[1]);
    const lng = Number(activeStop.coordinates?.[0]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return;

    try {
      map.panTo({ lat, lng });
    } catch {
      // Fallback
    }
  }, [map, activeStop, panTrigger]);

  return null;
}

// Safe marker rendering component that ensures Google Maps marker library is ready before mounting
function RouteStopMarkers({
  stops,
  activeIndex,
  onMarkerClick,
  language,
}: {
  stops: RouteStopItem[];
  activeIndex: number;
  onMarkerClick: (index: number) => void;
  language: string;
}) {
  const markerLib = useMapsLibrary("marker");
  if (!markerLib) return null;

  return (
    <>
      {stops.map((stop, index) => {
        const lat = Number(stop.coordinates?.[1]);
        const lng = Number(stop.coordinates?.[0]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;

        const isSelected = activeIndex === index;

        return (
          <AdvancedMarker
            key={stop.id || stop.placeId || `marker-${index}`}
            position={{ lat, lng }}
            zIndex={isSelected ? 50 : 10}
            onClick={() => onMarkerClick(index)}
          >
            <div
              title={`${index + 1}. ${getLocalized(stop.name, language)}`}
              className={`relative flex items-center justify-center cursor-pointer transition-all duration-300 transform select-none ${
                isSelected ? "scale-125 z-30" : "hover:scale-110 z-10"
              }`}
            >
              {/* Numbered Pin Badge */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shadow-xl border-2 transition-all ${
                  isSelected
                    ? "bg-[#FFC107] text-gray-950 border-white ring-4 ring-[#FFC107]/40 shadow-amber-500/30"
                    : "bg-white dark:bg-[#131b2e] text-gray-950 dark:text-amber-400 border-[#FFC107]"
                }`}
              >
                {index + 1}
              </div>

              {/* Marker Pin Tail */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#FFC107] rotate-45 rounded-[1px]" />
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
}

export default function RouteMapView({
  stops,
  selectedStopIndex,
  onSelectStop,
  className = "",
  height = "h-full",
}: RouteMapViewProps) {
  const { resolvedTheme } = useTheme();
  const { t, language } = useLanguage();
  const isDark = resolvedTheme === "dark";

  const [mapType, setMapType] = useState<string>("roadmap");
  const [fitTrigger, setFitTrigger] = useState<number>(0);
  const [internalActiveIndex, setInternalActiveIndex] = useState<number>(0);
  const [panTrigger, setPanTrigger] = useState<number>(0);

  // Sync internal active index with selectedStopIndex
  useEffect(() => {
    if (selectedStopIndex !== undefined && selectedStopIndex !== null) {
      setInternalActiveIndex(selectedStopIndex);
      setPanTrigger((p) => p + 1);
    }
  }, [selectedStopIndex]);

  // Keep index in range
  const activeIndex = Math.min(
    Math.max(0, internalActiveIndex),
    Math.max(0, stops.length - 1)
  );
  const activeStop = stops[activeIndex];

  // Default center: first valid stop or Puerto Rico fallback
  const defaultCenter = useMemo(() => {
    const valid = stops.find(
      (s) =>
        s.coordinates &&
        Number.isFinite(Number(s.coordinates[1])) &&
        Number.isFinite(Number(s.coordinates[0])) &&
        Number(s.coordinates[1]) !== 0 &&
        Number(s.coordinates[0]) !== 0
    );
    if (valid) {
      return {
        lat: Number(valid.coordinates[1]),
        lng: Number(valid.coordinates[0]),
      };
    }
    return { lat: 18.2208, lng: -66.5901 };
  }, [stops]);

  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "2b83d15fbb74673e997cfde8";

  const handleMarkerClick = (index: number) => {
    setInternalActiveIndex(index);
    setPanTrigger((p) => p + 1);
    if (onSelectStop) {
      onSelectStop(index);
    }
  };

  const handlePrevStop = () => {
    if (activeIndex > 0) {
      handleMarkerClick(activeIndex - 1);
    }
  };

  const handleNextStop = () => {
    if (activeIndex < stops.length - 1) {
      handleMarkerClick(activeIndex + 1);
    }
  };

  const handleDirections = (coordinates: [number, number]) => {
    const [lng, lat] = coordinates;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, "_blank");
  };

  return (
    <div
      style={{ width: "100%", height: "100%", minHeight: "280px" }}
      className={`relative w-full ${height} rounded-3xl overflow-hidden border border-gray-200/80 dark:border-slate-800 shadow-lg ${className}`}
    >
      <Map
        style={{ width: "100%", height: "100%" }}
        colorScheme={isDark ? "DARK" : "LIGHT"}
        defaultCenter={defaultCenter}
        defaultZoom={stops.length > 0 ? 11 : 9}
        minZoom={5}
        maxZoom={19}
        mapTypeId={mapType}
        renderingType="RASTER"
        mapId={mapId}
        disableDefaultUI={false}
        gestureHandling="greedy"
        className="w-full h-full"
      >
        {/* Fit Bounds Handler */}
        <FitBoundsHandler stops={stops} fitTrigger={fitTrigger} />

        {/* Pan to Selected Active Stop Handler */}
        <PanToActiveStopHandler activeStop={activeStop} panTrigger={panTrigger} />

        {/* Polyline Route */}
        <RoutePolyline stops={stops} />

        {/* Map Toolbar (Satellite / Recenter) */}
        <MapToolbar
          stops={stops}
          mapType={mapType}
          setMapType={setMapType}
          onRecenter={() => setFitTrigger((prev) => prev + 1)}
        />

        {/* Markers for each stop */}
        <RouteStopMarkers
          stops={stops}
          activeIndex={activeIndex}
          onMarkerClick={handleMarkerClick}
          language={language}
        />
      </Map>

      {/* Floating Route Legend & Stops Counter */}
      {stops.length > 0 && (
        <div className="absolute top-2.5 sm:top-4 left-2.5 sm:left-4 z-10 bg-white/95 dark:bg-[#131b2e]/95 backdrop-blur-md px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 text-[11px] sm:text-xs font-bold text-gray-800 dark:text-slate-100 flex items-center gap-1.5 sm:gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FFC107] animate-pulse" />
          <span>
            {stops.length}{" "}
            {stops.length === 1
              ? t("route_planner.stops_count_one") || "parada seleccionada"
              : t("route_planner.stops_count_many") || "paradas seleccionadas"}
          </span>
        </div>
      )}

      {/* Floating Bottom Active Stop Card on Map (Perfect for Mobile & Desktop) */}
      {stops.length > 0 && activeStop && (
        <div className="absolute bottom-2.5 sm:bottom-4 left-2.5 sm:left-4 right-2.5 sm:right-4 z-20 max-w-md mx-auto animate-in slide-in-from-bottom-2 duration-200">
          <div className="bg-white/95 dark:bg-[#131b2e]/95 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-gray-200/80 dark:border-slate-800 flex items-center gap-3">
            {/* Thumbnail + Number */}
            <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-slate-800">
              {getUsableMediaUrl(activeStop.media) ? (
                <SafeImage
                  src={getUsableMediaUrl(activeStop.media)!}
                  alt={getLocalized(activeStop.name, language)}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <MapPin className="w-5 h-5 text-amber-500" />
                </div>
              )}
              <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-[#FFC107] text-gray-950 font-black text-[10px] flex items-center justify-center shadow-md">
                {activeIndex + 1}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] uppercase font-black tracking-wider text-amber-600 dark:text-amber-400">
                  {t("route_planner.stop_singular") || "Parada"} {activeIndex + 1} / {stops.length}
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    disabled={activeIndex === 0}
                    onClick={handlePrevStop}
                    title={t("route_planner.prev_stop") || "Anterior"}
                    className="p-1 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={activeIndex === stops.length - 1}
                    onClick={handleNextStop}
                    title={t("route_planner.next_stop") || "Siguiente"}
                    className="p-1 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {activeStop.placeId ? (
                <Link
                  href={`/places/${activeStop.placeId}`}
                  className="text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100 hover:text-amber-500 hover:underline underline-offset-2 transition-colors truncate block"
                >
                  {getLocalized(activeStop.name, language)}
                </Link>
              ) : (
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100 truncate">
                  {getLocalized(activeStop.name, language)}
                </h4>
              )}
              <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 flex-shrink-0 text-gray-400" />
                <span className="truncate">{activeStop.address || "Puerto Rico"}</span>
              </p>

              <div className="flex items-center gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => handleDirections(activeStop.coordinates)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFC107] hover:bg-[#e6ad06] text-gray-950 font-bold text-[11px] shadow-sm transition-all"
                >
                  <Navigation className="w-3 h-3 fill-gray-950 -rotate-45" />
                  <span>{t("route_planner.directions") || "Cómo llegar"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
