"use client";
import { MapCostObserver } from "@/components/shared/maps/map-cost-observer";

import {
  AdvancedMarker,
  APIProvider,
  Map,
  useMap,
} from "@vis.gl/react-google-maps";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { CustomLocationButton } from "./CustomLocationButton";


interface MapLocationPickerProps {
  initialLocation?: { lat: number; lng: number };
  onLocationSelect: (location: { lat: number; lng: number }) => void;
}

function GeolocationOnLoad({
  onLocation,
}: {
  onLocation: (pos: { lat: number; lng: number }) => void;
}) {
  const map = useMap();
  const latestOnLocation = useRef(onLocation);
  useEffect(() => { latestOnLocation.current = onLocation; }, [onLocation]);

  useEffect(() => {
    if (!map || !navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition((pos) => {
      if (cancelled) return;
      const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      map.panTo(location);
      latestOnLocation.current(location);
    });
    return () => { cancelled = true; };
  }, [map]);

  return null;
}

export function MapLocationPicker({
  initialLocation,
  onLocationSelect,
}: MapLocationPickerProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  const defaultPosition = initialLocation || { lat: 23.8103, lng: 90.4125 };
  const [markerPos, setMarkerPos] = useState(defaultPosition);

  const handleMapClick = (e: any) => {
    const newLat = e.detail.latLng.lat;
    const newLng = e.detail.latLng.lng;
    const newPos = { lat: newLat, lng: newLng };
    setMarkerPos(newPos);
    onLocationSelect(newPos);
  };

  return (
    <div className="w-full h-full min-h-[400px] relative rounded-lg overflow-hidden border border-gray-200 dark:border-slate-800">
      <APIProvider
        apiKey={(process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY || "").trim()}
      >
        {mounted && <Map
          colorScheme={isDark ? "DARK" : "LIGHT"}
          defaultCenter={defaultPosition}
          defaultZoom={13}
          minZoom={3}
          maxZoom={19}
          renderingType={"RASTER"}
          gestureHandling={"greedy"}
          disableDefaultUI={false}
          streetViewControl={false}
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_PLACES_ID || "DEMO_MAP_ID"}
          onClick={handleMapClick}
          style={{ width: "100%", height: "100%" }}
          clickableIcons={true}
        >
          <MapCostObserver surface="location-picker" />
          {!initialLocation && (
            <GeolocationOnLoad
              onLocation={(pos) => {
                setMarkerPos(pos);
                onLocationSelect(pos);
              }}
            />
          )}
          <CustomLocationButton />
          <AdvancedMarker
            position={markerPos}
            draggable={true}
            onDragEnd={(e: any) => {
              if (e.latLng) {
                const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                setMarkerPos(newPos);
                onLocationSelect(newPos);
              }
            }}
          />
        </Map>}
      </APIProvider>
    </div>
  );
}
