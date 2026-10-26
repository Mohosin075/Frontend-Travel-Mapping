"use client";

import { CustomLocationButton } from "@/components/shared/maps/CustomLocationButton";
import { SatelliteToggleButton } from "@/components/shared/maps/SatelliteToggleButton";
import { CategoryMarker } from "@/components/shared/maps/category-marker";
import { GeolocationOnLoad } from "@/components/shared/maps/geolocation-on-load";
import { UserLocationMarker } from "@/components/shared/maps/user-location-marker";
import { useGetCategoriesQuery } from "@/redux/features/category/categoryApi";
import { useGetMapsQuery } from "@/redux/features/map/mapApi";
import { normalizePinType, trackUsage } from "@/lib/record-visit";
import { useGetPublicPlacesBusinessQuery } from "@/redux/features/public/publicApi";
import { useGetProfileQuery } from "@/redux/features/user/userApi";
import { useGetMyVisitedPlacesQuery } from "@/redux/features/visited/visitedApi";
import { useAppSelector } from "@/redux/hook";
import {
  AdvancedMarker,
  APIProvider,
  ControlPosition,
  Map,
  MapControl,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { MapFilters, SelectedMapFilter } from "./MapFilters";
import LocationDialog from "./location-dialog";
import { getUsableMediaUrl } from "@/lib/utils";
import { X } from "lucide-react";

export function getCategoryColor(cat: any) {
  return cat?.color || "#FF9800";
}

/** Cap markers drawn at once — purchased maps can have hundreds of pins. */
const MAX_VISIBLE_MARKERS = 250;

/** Restrict map panning to world boundaries so it cannot be dragged off-screen */
const WORLD_MAP_BOUNDS = {
  latLngBounds: {
    north: 85,
    south: -85,
    west: -180,
    east: 180,
  },
  strictBounds: true,
};

/** Hide default Google Maps location/POI icons (supermarkets, gas stations, malls, businesses, transit) so only platform-curated pins are visible */
export const HIDE_GOOGLE_POI_STYLES: google.maps.MapTypeStyle[] = [
  {
    featureType: "poi",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.business",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.attraction",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.government",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.medical",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.place_of_worship",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.school",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.sports_complex",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit.station",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
];

/** Comprehensive dark theme styling ensuring all Google POIs, businesses, supermarkets, gas stations and transit are hidden */
export const DARK_MAP_STYLES_NO_POI: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1a2234" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#131a28" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#cbd5e1" }],
  },
  {
    featureType: "poi",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.business",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.attraction",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.government",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.medical",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.park",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.place_of_worship",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.school",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.sports_complex",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#293548" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2937" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#94a3b8" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#374761" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#293548" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#cbd5e1" }],
  },
  {
    featureType: "transit",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit.line",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit.station",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit.station.airport",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit.station.bus",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit.station.rail",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0f172a" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#64748b" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#0f172a" }],
  },
];

/** Ensures that Google Maps POIs (supermarkets, gas stations, malls, businesses, transit) remain completely hidden at runtime using custom StyledMapType and styles */
function MapPoiHider({ isDark }: { isDark: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (typeof google !== "undefined" && google.maps && google.maps.StyledMapType) {
      const darkMapType = new google.maps.StyledMapType(DARK_MAP_STYLES_NO_POI, {
        name: "Dark Map",
      });
      map.mapTypes.set("dark_mode_no_poi", darkMapType);
    }

    const currentMapTypeId = map.getMapTypeId();
    const isSatellite = currentMapTypeId === "satellite" || currentMapTypeId === "hybrid";

    if (!isSatellite) {
      if (isDark) {
        map.setMapTypeId("dark_mode_no_poi");
      } else {
        map.setMapTypeId("roadmap");
      }
    }

    map.setOptions({
      styles: isDark ? DARK_MAP_STYLES_NO_POI : HIDE_GOOGLE_POI_STYLES,
      clickableIcons: false,
    });
  }, [map, isDark]);

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("maptypeid_changed", () => {
      const type = map.getMapTypeId();
      if (type === "roadmap" && isDark) {
        map.setMapTypeId("dark_mode_no_poi");
      }
    });

    return () => {
      if (typeof google !== "undefined" && google.maps) {
        google.maps.event.removeListener(listener);
      }
    };
  }, [map, isDark]);

  return null;
}

function getPlaceLatLng(place: any): { lat: number; lng: number } | null {
  const coords =
    place?.location?.mapLocation?.coordinates ||
    place?.location?.coordinates;
  const lat = coords?.[1] ?? place?.latitude;
  const lng = coords?.[0] ?? place?.longitude;
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }
  return { lat: Number(lat), lng: Number(lng) };
}

export function normalizeAccents(str: unknown): string {
  if (!str) return "";
  if (typeof str === "object") {
    const obj = str as Record<string, unknown>;
    const en = typeof obj.en === "string" ? obj.en : "";
    const es = typeof obj.es === "string" ? obj.es : "";
    return `${en} ${es}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchesSearch(place: any, query: string): boolean {
  if (!query) return true;
  const normalizedQuery = normalizeAccents(query).trim();
  if (!normalizedQuery) return true;

  const combined = [
    normalizeAccents(place?.name),
    normalizeAccents(place?.address),
    normalizeAccents(place?.location?.address),
    normalizeAccents(place?.location?.city),
    normalizeAccents(place?.location?.state),
    normalizeAccents(place?.location?.municipality || place?.municipality),
    normalizeAccents(place?.location?.region || place?.region),
    normalizeAccents(place?.location?.town || place?.town),
    normalizeAccents(place?.location?.country || place?.country),
  ].join(" ");

  return combined.includes(normalizedQuery);
}

/** Only mount AdvancedMarkers inside the current map viewport (big win for purchased users). */
function ViewportPlaceMarkers({
  places,
  fetchedCategories,
  selectedLocation,
  setSelectedLocation,
  isMobile,
  visitedPlaceIds,
}: {
  places: any[];
  fetchedCategories: any[];
  selectedLocation: any;
  setSelectedLocation: (loc: any) => void;
  isMobile: boolean;
  visitedPlaceIds?: Set<string>;
}) {
  const map = useMap();
  const [bounds, setBounds] = useState<{
    contains: (latLng: { lat: number; lng: number }) => boolean;
  } | null>(null);

  useEffect(() => {
    if (!map) return;
    const updateBounds = () => {
      setBounds(map.getBounds() ?? null);
    };
    updateBounds();
    const listener = map.addListener("idle", updateBounds);
    return () => {
      listener.remove();
    };
  }, [map]);

  const visiblePlaces = useMemo(() => {
    if (!places?.length) return [];

    // Before bounds ready, paint a small first batch so UI stays responsive
    if (!bounds) {
      return places.slice(0, 60);
    }

    const inView: any[] = [];
    for (const place of places) {
      const pos = getPlaceLatLng(place);
      if (!pos) continue;
      if (bounds.contains(pos)) {
        inView.push(place);
        if (inView.length >= MAX_VISIBLE_MARKERS) break;
      }
    }

    // Keep selected marker mounted even if outside current cap
    if (
      selectedLocation?.id &&
      !inView.some((p) => p._id === selectedLocation.id)
    ) {
      const selected = places.find((p) => p._id === selectedLocation.id);
      if (selected) inView.unshift(selected);
    }

    return inView;
  }, [places, bounds, selectedLocation]);

  return (
    <>
      {visiblePlaces.map((place: any) => {
        const position = getPlaceLatLng(place);
        if (!position) return null;

        const cat =
          typeof place.category === "object" && place.category !== null
            ? place.category
            : fetchedCategories.find((c: any) => c._id === place.category);

        const icon = cat?.icon || "📍";
        const color = getCategoryColor(cat);

        const placeId = place._id || place.id;
        const isSelected = selectedLocation?.id === placeId;
        const handleMarkerClick = (e?: React.MouseEvent | any) => {
          if (e && typeof e.stopPropagation === "function") {
            e.stopPropagation();
          }
          const cover = getUsableMediaUrl(place.media?.photos || place.media);
          if (cover && typeof window !== "undefined") {
            const img = new Image();
            img.src = cover;
          }
          setSelectedLocation({
            id: placeId,
            type: normalizePinType(place),
            data: place,
          });
        };

        return (
          <AdvancedMarker
            key={placeId}
            position={position}
            zIndex={isSelected ? 9999 : 10}
            onClick={() => handleMarkerClick()}
          >
            <CategoryMarker
              icon={icon}
              color={color}
              name={place.name}
              isSelected={selectedLocation?.id === placeId}
              isLocked={place.isLocked}
              isMobile={isMobile}
              isVisited={
                visitedPlaceIds?.has(String(place._id)) ||
                (place.id ? visitedPlaceIds?.has(String(place.id)) : false) ||
                Boolean(place.isVisited)
              }
              onClick={handleMarkerClick}
            />
          </AdvancedMarker>
        );
      })}
    </>
  );
}

const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number; zoom: number }> = {
  "puerto rico": { lat: 18.2208, lng: -66.5901, zoom: 10 },
  "republica dominicana": { lat: 18.7357, lng: -70.1627, zoom: 8 },
  "república dominicana": { lat: 18.7357, lng: -70.1627, zoom: 8 },
  "dominican republic": { lat: 18.7357, lng: -70.1627, zoom: 8 },
  "estados unidos": { lat: 37.0902, lng: -95.7129, zoom: 5 },
  "usa": { lat: 37.0902, lng: -95.7129, zoom: 5 },
  "united states": { lat: 37.0902, lng: -95.7129, zoom: 5 },
};

function isSameCountry(a: string, b: string): boolean {
  if (!a || !b) return false;
  const normA = normalizeAccents(a).trim().toLowerCase();
  const normB = normalizeAccents(b).trim().toLowerCase();
  if (normA === normB) return true;
  const aliases: Record<string, string> = {
    "dominican republic": "dr",
    "republica dominicana": "dr",
    "united states": "usa",
    "estados unidos": "usa",
    "usa": "usa",
    "puerto rico": "pr",
  };
  return Boolean(aliases[normA] && aliases[normA] === aliases[normB]);
}

function CountryPanner({
  selectedCountry,
  isManualSelection,
  disabled,
}: {
  selectedCountry: string;
  isManualSelection: boolean;
  disabled?: boolean;
}) {
  const map = useMap();
  const geocodingLib = useMapsLibrary("geocoding");

  useEffect(() => {
    if (
      disabled ||
      !map ||
      !selectedCountry ||
      !isManualSelection
    )
      return;

    const key = selectedCountry.trim().toLowerCase();
    const preset = COUNTRY_COORDINATES[key];
    if (preset) {
      map.panTo({ lat: preset.lat, lng: preset.lng });
      map.setZoom(preset.zoom);
      return;
    }

    if (!geocodingLib) return;
    const geocoder = new geocodingLib.Geocoder();
    geocoder.geocode(
      { address: selectedCountry },
      (results: any[] | null, status: string) => {
        if (status === "OK" && results?.[0]) {
          if (results[0].geometry.viewport) {
            map.fitBounds(results[0].geometry.viewport);
          } else {
            map.setCenter(results[0].geometry.location);
            map.setZoom(6);
          }
        }
      },
    );
  }, [selectedCountry, map, geocodingLib, isManualSelection, disabled]);

  return null;
}

function MapPanner({
  selectedId,
  position,
  isMobile,
}: {
  selectedId: string | null;
  position: { lat: number; lng: number } | null;
  isMobile?: boolean;
}) {
  const map = useMap();
  const lastSelectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedId || !position) {
      lastSelectedIdRef.current = null;
      return;
    }

    // Do not pan or zoom again if already panned to this selected location
    if (lastSelectedIdRef.current === selectedId) {
      return;
    }

    lastSelectedIdRef.current = selectedId;

    if (map) {
      let targetCenter = position;

      // On mobile, offset smoothly so the pin lands higher up, clearly visible above the bottom preview modal
      if (isMobile) {
        try {
          const projection = map.getProjection();
          if (projection && typeof google !== "undefined" && google.maps) {
            const zoom = map.getZoom() || 13;
            const scale = Math.pow(2, zoom);
            const latLng = new google.maps.LatLng(position.lat, position.lng);
            const worldPoint = projection.fromLatLngToPoint(latLng);
            if (worldPoint) {
              const targetPoint = new google.maps.Point(
                worldPoint.x,
                worldPoint.y + (70 / scale)
              );
              const targetLatLng = projection.fromPointToLatLng(targetPoint);
              if (targetLatLng) {
                targetCenter = { lat: targetLatLng.lat(), lng: targetLatLng.lng() };
              }
            }
          }
        } catch {
          // Fallback to direct position if projection is unavailable
        }
      }

      // Single fluid, uninterrupted pan animation directly to target
      map.panTo(targetCenter);
    }
  }, [map, selectedId, position, isMobile]);
  return null;
}

function FocusSetup({
  lat,
  lng,
  satellite,
  active,
}: {
  lat: number;
  lng: number;
  satellite: boolean;
  active: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !active) return;
    if (satellite) {
      map.setMapTypeId("satellite");
    }
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      map.panTo({ lat, lng });
      const currentZoom = map.getZoom();
      if (currentZoom == null || currentZoom < 12) {
        map.setZoom(13);
      }
    }
  }, [map, lat, lng, satellite, active]);

  return null;
}

function SearchPanner({
  searchQuery,
  places,
}: {
  searchQuery: string;
  places: any[];
}) {
  const map = useMap();
  const lastSearchRef = useRef("");

  useEffect(() => {
    if (!map || !searchQuery || lastSearchRef.current === searchQuery) return;
    lastSearchRef.current = searchQuery;

    if (places && places.length > 0) {
      if (places.length === 1) {
        const coords = getPlaceLatLng(places[0]);
        if (coords) {
          map.panTo(coords);
          const curr = map.getZoom();
          if (curr == null || curr < 12) map.setZoom(13);
        }
      } else {
        const bounds = new google.maps.LatLngBounds();
        let count = 0;
        for (const p of places) {
          const coords = getPlaceLatLng(p);
          if (coords) {
            bounds.extend(coords);
            count++;
          }
        }
        if (count > 0) {
          map.fitBounds(bounds, { top: 80, bottom: 90, left: 40, right: 40 });
        }
      }
    }
  }, [map, searchQuery, places]);

  return null;
}

export default function MapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Puerto Rico center as natural default coordinates
  const defaultPosition = { lat: 18.2208, lng: -66.5901 };
  const [markerPos, setMarkerPos] = useState(defaultPosition);
  const [hasUserLocation, setHasUserLocation] = useState(false);

  const [enabledCategories, setEnabledCategories] = useState<
    Record<string, boolean>
  >(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("mapCategoryPreferences");
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  const { t, language } = useLanguage();
  const [selectedMapId, setSelectedMapId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedMapId") || "";
    }
    return "";
  });
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [detectedCountry, setDetectedCountry] = useState<string>("");
  const [isManualSelection, setIsManualSelection] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [pendingFocus, setPendingFocus] = useState<{
    id: string;
    type: string;
    lat: number;
    lng: number;
    map: string;
    satellite: boolean;
  } | null>(null);
  const [focusReady, setFocusReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = hasMounted && resolvedTheme === "dark";
  const [initialMapState, setInitialMapState] = useState<{ center: { lat: number, lng: number }, zoom: number } | null>(null);
  const focusMapAppliedRef = useRef(false);

  // Capture View-on-Map / search deep-link whenever focus params appear
  useEffect(() => {
    const focusId = searchParams.get("focus") || "";
    const focusType = (searchParams.get("type") || "place").toLowerCase();
    const focusMap = searchParams.get("map") || "";
    const focusLat = parseFloat(searchParams.get("lat") || "");
    const focusLng = parseFloat(searchParams.get("lng") || "");
    const wantSatellite = searchParams.get("satellite") === "1";
    const hasCoords =
      Number.isFinite(focusLat) &&
      Number.isFinite(focusLng) &&
      focusLat !== 0 &&
      focusLng !== 0;

    if (!focusId && !hasCoords) return;

    focusMapAppliedRef.current = false;
    setFocusReady(false);
    setPendingFocus({
      id: focusId,
      type: focusType === "business" ? "business" : "place",
      lat: focusLat,
      lng: focusLng,
      map: focusMap,
      satellite: wantSatellite,
    });
    router.replace("/maps", { scroll: false });
  }, [searchParams, router]);

  /** User switching maps must fully release View-on-Map lock */
  const handleSelectCountry = (val: string) => {
    focusMapAppliedRef.current = true;
    setPendingFocus(null);
    setFocusReady(true);
    setSelectedLocation(null);

    const rawList = Array.isArray(mapsResponse?.data) ? mapsResponse.data : [];
    const matched = rawList.find(
      (m: any) =>
        String(m._id) === val ||
        normalizeAccents(m.name).toLowerCase() === normalizeAccents(val).toLowerCase() ||
        isSameCountry(m.name, val)
    );
    if (matched) {
      const mid = String(matched._id);
      setSelectedMapId(mid);
      localStorage.setItem("selectedMapId", mid);
      setSelectedCountry(matched.name);
      localStorage.setItem("selectedCountryFilter", matched.name);
    } else {
      setSelectedCountry(val);
      localStorage.setItem("selectedCountryFilter", val);
    }
    setIsManualSelection(true);
  };

  useEffect(() => {
    try {
      const savedCamera = sessionStorage.getItem("mapCameraState");
      if (savedCamera) {
        setInitialMapState(JSON.parse(savedCamera));
      }
      const savedLoc = sessionStorage.getItem("mapSelectedLocation");
      if (savedLoc) {
        setSelectedLocation(JSON.parse(savedLoc));
      }
    } catch (e) { }
    setHasMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      sessionStorage.setItem("mapSelectedLocation", JSON.stringify(selectedLocation));
    } else {
      sessionStorage.removeItem("mapSelectedLocation");
    }
  }, [selectedLocation]);

  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const {
    data: userProfile,
    isLoading: isLoadingUser,
    isFetching: isFetchingUser,
  } = useGetProfileQuery({}, { skip: !accessToken });
  const { data: visitedRes } = useGetMyVisitedPlacesQuery(undefined, {
    skip: !accessToken,
  });

  const visitedPlaceIds = useMemo(() => {
    const ids = new Set<string>();
    const list: any[] = visitedRes?.data || [];
    for (const item of list) {
      const pid = item.place?._id || item.place || item.business?._id || item.business;
      if (pid) ids.add(String(pid));
    }
    const userVisited: any[] = userProfile?.visitedPlaces || [];
    for (const v of userVisited) {
      const vid = typeof v === "object" ? (v?._id || v?.id) : v;
      if (vid) ids.add(String(vid));
    }
    return ids;
  }, [visitedRes, userProfile?.visitedPlaces]);

  const isLoggedIn = !!userProfile;
  // Guests skip profile; logged-in users wait until profile request finishes
  const isUserResolved = !accessToken || (!isLoadingUser && !isFetchingUser) || !!userProfile;

  const geocodingLib = useMapsLibrary("geocoding");

  const handleToggle = (id: string, value: boolean) => {
    setEnabledCategories((prev) => {
      const next = { ...prev, [String(id)]: value };
      try {
        localStorage.setItem("mapCategoryPreferences", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const {
    data: mapsResponse,
    isLoading: isLoadingMaps,
    isFetching: isFetchingMaps,
    isSuccess: isMapsSuccess,
  } = useGetMapsQuery({
    limit: 100,
  });
  const rawMapsList = Array.isArray(mapsResponse?.data) ? mapsResponse.data : [];
  const availableCountries = rawMapsList.map((m: any) => m.name) || [];

  const selectedMapObj = useMemo(() => {
    if (!rawMapsList.length) return null;
    if (selectedMapId) {
      const byId = rawMapsList.find((m: any) => String(m._id) === String(selectedMapId));
      if (byId) return byId;
    }
    if (selectedCountry) {
      const byName = rawMapsList.find(
        (m: any) =>
          normalizeAccents(m.name).toLowerCase() === normalizeAccents(selectedCountry).toLowerCase() ||
          isSameCountry(m.name, selectedCountry) ||
          isSameCountry(m.country, selectedCountry)
      );
      if (byName) return byName;
    }
    return null;
  }, [rawMapsList, selectedMapId, selectedCountry]);

  // Keep selectedCountry and selectedMapId in sync whenever selectedMapObj resolves or changes language
  useEffect(() => {
    if (selectedMapObj) {
      const currentMapId = String(selectedMapObj._id);
      if (selectedMapId !== currentMapId) {
        setSelectedMapId(currentMapId);
        localStorage.setItem("selectedMapId", currentMapId);
      }
      if (selectedCountry !== selectedMapObj.name) {
        setSelectedCountry(selectedMapObj.name);
        localStorage.setItem("selectedCountryFilter", selectedMapObj.name);
      }
    }
  }, [selectedMapObj, selectedMapId, selectedCountry]);

  const mapIdFilter = selectedMapObj ? String(selectedMapObj._id) : (selectedMapId || "");
  const canFetchPlaces = Boolean(mapIdFilter);
  useEffect(() => {
    if (!mapIdFilter) return;
    trackUsage("map", mapIdFilter);
  }, [mapIdFilter]);

  const {
    data: placesRes,
    isLoading: isLoadingPlaces,
    isFetching: isFetchingPlaces,
    isSuccess: isPlacesSuccess,
    isError: isPlacesError,
  } = useGetPublicPlacesBusinessQuery(
    {
      limit: 1000,
      map: mapIdFilter,
    },
    { skip: !canFetchPlaces },
  );

  // Only treat discovery as settled for the *current* map after its fetch completes.
  // Cleared immediately when mapId changes so empty-state cannot flash mid-switch.
  const [settledMapId, setSettledMapId] = useState<string | null>(null);

  useEffect(() => {
    setSettledMapId(null);
  }, [mapIdFilter]);

  useEffect(() => {
    if (!mapIdFilter) return;
    if ((isPlacesSuccess || isPlacesError) && !isFetchingPlaces && !isLoadingPlaces) {
      setSettledMapId(mapIdFilter);
    }
  }, [
    mapIdFilter,
    isPlacesSuccess,
    isPlacesError,
    isFetchingPlaces,
    isLoadingPlaces,
  ]);

  const isPlacesSettledForMap =
    !!mapIdFilter && settledMapId === mapIdFilter;

  const fetchedPlaces = Array.isArray(placesRes?.data)
    ? placesRes.data
    : Array.isArray(placesRes)
      ? placesRes
      : [];

  const {
    data: categoriesRes,
    isLoading: isLoadingCategories,
    isSuccess: isCategoriesSuccess,
    isError: isCategoriesError,
  } = useGetCategoriesQuery({ limit: 100 });

  const rawCategories = Array.isArray(categoriesRes?.data)
    ? categoriesRes.data
    : Array.isArray(categoriesRes)
      ? categoriesRes
      : [];

  const isCategoriesSettled =
    (isCategoriesSuccess || isCategoriesError) && !isLoadingCategories;

  const isMapsSettled =
    (isMapsSuccess || (!isLoadingMaps && !isFetchingMaps)) && !isLoadingMaps;

  // Selected map name exists in list but id not resolved yet, OR still picking a map
  const mapMissingAfterMapsLoaded =
    isMapsSettled &&
    !!selectedCountry &&
    availableCountries.length > 0 &&
    !availableCountries.includes(selectedCountry);

  // Strict gate: spinner until EVERY dependency for the sidebar is ready.
  // Empty state is ONLY allowed after this is false.
  const isSidebarLoading =
    !hasMounted ||
    !isUserResolved ||
    !isMapsSettled ||
    !isCategoriesSettled ||
    !selectedCountry ||
    (!mapIdFilter && !mapMissingAfterMapsLoaded) ||
    (canFetchPlaces &&
      (!isPlacesSettledForMap ||
        isLoadingPlaces ||
        (isFetchingPlaces && settledMapId !== mapIdFilter)));

  // Identify categories that are inherently "business" (supporting EN/ES words)
  const inherentlyBusinessCatIds = new Set(
    rawCategories
      .filter((cat: any) => {
        const nameStr = (
          typeof cat.name === "object"
            ? `${cat.name?.en || ""} ${cat.name?.es || ""}`
            : String(cat.name || "")
        ).toLowerCase();
        return (
          nameStr.includes("business") ||
          nameStr.includes("negocio") ||
          nameStr.includes("comercio")
        );
      })
      .map((cat: any) => String(cat._id)),
  );

  // Discovery overwrites Place.type with "place"; original Business|Regular lives in placeType.
  // Business-collection rows use type "business".
  const isBusinessLocation = (p: any) =>
    p?.type === "business" ||
    p?.type === "Business" ||
    p?.placeType === "Business";

  const getCategoryId = (p: any) => {
    const raw =
      typeof p.category === "object" && p.category !== null
        ? p.category._id || p.category.id
        : p.category;
    return raw != null ? String(raw) : "";
  };

  // Places are scoped by map id; Business docs have no `map` — match by country/map name.
  const belongsToSelectedMap = (place: any) => {
    if (!selectedCountry && !selectedMapId) return true;

    if (selectedMapObj) {
      const placeMapId =
        typeof place.map === "object" ? place.map?._id || place.map?.id : place.map;
      if (placeMapId && String(placeMapId) === String(selectedMapObj._id)) {
        return true;
      }
    }

    const placeCountry = place?.location?.country || place?.country || "";
    const mapCountry = selectedMapObj?.country || selectedMapObj?.name || selectedCountry;
    return isSameCountry(placeCountry, mapCountry);
  };

  let fetchedCategories: any[] = [];

  // Never compute empty sidebar lists until loading is fully done for this map.
  if (!isSidebarLoading && isPlacesSettledForMap) {
    fetchedCategories = [...rawCategories];

    // Sync latest populated category details (icon, color, name) from places into fetchedCategories
    const categoryMapFromPlaces: Record<string, any> = {};
    for (const place of fetchedPlaces) {
      if (typeof place.category === "object" && place.category !== null) {
        const catId = String(place.category._id || place.category.id);
        if (catId) {
          categoryMapFromPlaces[catId] = place.category;
        }
      }
    }

    fetchedCategories = fetchedCategories.map((cat: any) => {
      const fromPlace = categoryMapFromPlaces[String(cat._id)];
      if (fromPlace) {
        return {
          ...cat,
          icon: fromPlace.icon || cat.icon,
          color: fromPlace.color || cat.color,
          name: fromPlace.name || cat.name,
        };
      }
      return cat;
    });

    if (!isLoggedIn) {
      const businessPlaceCatIds = new Set(
        fetchedPlaces
          .filter(isBusinessLocation)
          .map(getCategoryId)
          .filter(Boolean),
      );

      fetchedCategories = fetchedCategories.filter(
        (cat: any) =>
          inherentlyBusinessCatIds.has(String(cat._id)) ||
          businessPlaceCatIds.has(String(cat._id)),
      );
    }

    const validPlacesForCurrentCountry =
      fetchedPlaces?.filter(belongsToSelectedMap) || [];

    const validCatIds = new Set(
      validPlacesForCurrentCountry.map(getCategoryId).filter(Boolean),
    );

    fetchedCategories = fetchedCategories.filter((cat: any) =>
      validCatIds.has(String(cat._id)),
    );
  }

  // Detect country from markerPos (current location)
  useEffect(() => {
    if (!geocodingLib || !hasUserLocation || !markerPos.lat || !markerPos.lng) return;

    const geocoder = new geocodingLib.Geocoder();
    geocoder.geocode(
      { location: markerPos },
      (results: any[] | null, status: string) => {
        if (status === "OK" && results?.[0]) {
          const countryComponent = results[0].address_components.find(
            (c: { types: string[]; long_name: string }) =>
              c.types.includes("country"),
          );
          if (countryComponent) {
            setDetectedCountry(countryComponent.long_name);
          }
        }
      },
    );
  }, [markerPos, geocodingLib]);

  // Apply deep-link map once only (never fight later manual map switches)
  useEffect(() => {
    if (focusMapAppliedRef.current) return;
    if (!pendingFocus?.map || rawMapsList.length === 0) return;
    const matched = rawMapsList.find(
      (m: any) =>
        String(m._id) === pendingFocus.map ||
        normalizeAccents(m.name).toLowerCase() === normalizeAccents(pendingFocus.map).toLowerCase() ||
        isSameCountry(m.name, pendingFocus.map)
    );
    if (matched) {
      setSelectedMapId(String(matched._id));
      setSelectedCountry(matched.name);
      localStorage.setItem("selectedMapId", String(matched._id));
      localStorage.setItem("selectedCountryFilter", matched.name);
      setIsManualSelection(true);
      focusMapAppliedRef.current = true;
    }
  }, [pendingFocus, rawMapsList]);

  // Set initial selectedCountry based on saved id, detection, profile, or default
  useEffect(() => {
    if (selectedMapId || selectedCountry || isManualSelection || rawMapsList.length === 0) return;

    const savedId = localStorage.getItem("selectedMapId");
    const savedCountry = localStorage.getItem("selectedCountryFilter");

    const matchedById = savedId ? rawMapsList.find((m: any) => String(m._id) === savedId) : null;
    const matchedByCountry = savedCountry
      ? rawMapsList.find(
          (m: any) =>
            normalizeAccents(m.name).toLowerCase() === normalizeAccents(savedCountry).toLowerCase() ||
            isSameCountry(m.name, savedCountry)
        )
      : null;
    const matchedByDetected = detectedCountry
      ? rawMapsList.find(
          (m: any) =>
            normalizeAccents(m.name).toLowerCase() === normalizeAccents(detectedCountry).toLowerCase() ||
            isSameCountry(m.name, detectedCountry) ||
            isSameCountry(m.country, detectedCountry)
        )
      : null;
    const matchedByProfile = userProfile?.country
      ? rawMapsList.find(
          (m: any) =>
            normalizeAccents(m.name).toLowerCase() === normalizeAccents(userProfile.country).toLowerCase() ||
            isSameCountry(m.name, userProfile.country) ||
            isSameCountry(m.country, userProfile.country)
        )
      : null;

    const chosen = matchedById || matchedByCountry || matchedByDetected || matchedByProfile || rawMapsList[0];
    if (chosen) {
      setSelectedMapId(String(chosen._id));
      setSelectedCountry(chosen.name);
      localStorage.setItem("selectedMapId", String(chosen._id));
      localStorage.setItem("selectedCountryFilter", chosen.name);
      if (!sessionStorage.getItem("mapCameraState")) {
        setIsManualSelection(true);
      }
    }
  }, [detectedCountry, userProfile, isManualSelection, selectedMapId, selectedCountry, rawMapsList]);

  useEffect(() => {
    if (selectedCountry) {
      localStorage.setItem("selectedCountryFilter", selectedCountry);
    }
  }, [selectedCountry]);

  // Initialize categories once loaded, preserving user's deactivated choices
  useEffect(() => {
    if (fetchedCategories.length > 0) {
      let savedPrefs: Record<string, boolean> = {};
      try {
        const saved = localStorage.getItem("mapCategoryPreferences");
        if (saved) savedPrefs = JSON.parse(saved);
      } catch (e) {}

      setEnabledCategories((prev) => {
        let changed = false;
        const next = { ...prev };
        fetchedCategories.forEach((c: any) => {
          const id = String(c._id);
          if (next[id] === undefined) {
            next[id] = savedPrefs[id] !== undefined ? savedPrefs[id] : true;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [fetchedCategories]);

  // Select pin + open popup once places are ready, then release focus lock
  useEffect(() => {
    if (!pendingFocus?.id || focusReady || !isPlacesSettledForMap) return;

    setSelectedLocation({
      id: pendingFocus.id,
      type: normalizePinType(pendingFocus.type),
    });
    setFocusReady(true);

    // Keep FocusSetup briefly for satellite + pan, then unlock map switching
    const timer = setTimeout(() => setPendingFocus(null), 600);
    return () => clearTimeout(timer);
  }, [pendingFocus, focusReady, isPlacesSettledForMap]);

  const searchQuery = (searchParams.get("q") || searchParams.get("search") || "").trim();

  const purchasedMaps = Array.isArray(userProfile?.purchasedMaps) ? userProfile.purchasedMaps : [];
  const isAdminOrEditor = ["super_admin", "admin", "map_editor"].includes(userProfile?.role || "");
  const isFreeMap = selectedMapObj && selectedMapObj.isPaid === false;

  const isCurrentMapPurchased = isAdminOrEditor || isFreeMap || (selectedMapObj && purchasedMaps.some((m: any) => {
    const mid = typeof m === "object" ? (m._id || m.id) : m;
    return String(mid) === String(selectedMapObj._id);
  }));

  const isNewlyAddedLocation = (place: any) => {
    if (place.isNewlyAdded || place.isNew) return true;
    if (place.createdAt) {
      const createdTime = new Date(place.createdAt).getTime();
      if (!isNaN(createdTime)) {
        return (Date.now() - createdTime) <= (60 * 24 * 60 * 60 * 1000); // 60 days
      }
    }
    return false;
  };

  const processPlaceForUser = (place: any) => {
    const isBusiness = isBusinessLocation(place);
    const categoryId = getCategoryId(place);
    const isInherentlyBusiness = categoryId && inherentlyBusinessCatIds.has(categoryId);

    // Requirement 1: Non-business places on unpurchased maps appear as locked pins with padlock icon
    const isLocked = Boolean(
      place.isLocked ||
      (isUserResolved && !isCurrentMapPurchased && !isBusiness && !isInherentlyBusiness)
    );

    let name = place.name;
    const isGuest = !isLoggedIn;
    const isNewLocation = isNewlyAddedLocation(place);

    // Point 1: Locked pins should not display the name of the location
    if (isLocked) {
      name = {
        en: "Premium Location",
        es: "Ubicación Premium",
      };
    }

    return {
      ...place,
      name,
      isLocked,
      isNewlyAdded: isNewLocation,
    };
  };

  // Requirement 1: Pins appear at their respective locations marked with a padlock icon
  const displayPlaces = (selectedCountry && isPlacesSettledForMap)
    ? fetchedPlaces?.filter((place: any) => {
      if (!belongsToSelectedMap(place)) return false;

      // Municipality/region/city/town address filter when searching (accent-insensitive)
      if (searchQuery && !matchesSearch(place, searchQuery)) {
        return false;
      }

      const categoryId = getCategoryId(place);
      if (!categoryId) return true;

      return enabledCategories[categoryId] !== false;
    }).map(processPlaceForUser)
    : [];

  // Sidebar places: include all locations for selected map (unpurchased spots appear locked with padlock icon)
  const sidebarPlaces = (selectedCountry && isPlacesSettledForMap)
    ? fetchedPlaces.filter((place: any) => {
        if (!belongsToSelectedMap(place)) return false;

        if (searchQuery && !matchesSearch(place, searchQuery)) {
          return false;
        }

        return true;
      }).map(processPlaceForUser)
    : [];

  if (!hasMounted) return null;

  return (
    <div className="">
      <div className="relative" style={{ height: "calc(100vh - 90px)", width: "100%" }}>
        <APIProvider
          apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY as string}
        >
          <Map
            defaultCenter={initialMapState?.center || defaultPosition}
            defaultZoom={initialMapState?.zoom || 13}
            onCameraChanged={(ev) => {
              try {
                sessionStorage.setItem("mapCameraState", JSON.stringify({
                  center: ev.detail.center,
                  zoom: ev.detail.zoom
                }));
              } catch (e) { }
            }}
            minZoom={3}
            maxZoom={19}
            restriction={WORLD_MAP_BOUNDS}
            renderingType={"RASTER"}
            gestureHandling={"greedy"}
            disableDefaultUI={false}
            streetViewControl={false}
            mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID as string}
            mapTypeControl={!isMobile}
            mapTypeControlOptions={{
              position: ControlPosition.TOP_RIGHT,
            }}
            styles={isDark ? DARK_MAP_STYLES_NO_POI : HIDE_GOOGLE_POI_STYLES}
            clickableIcons={false}
          >
            <MapPoiHider isDark={isDark} />
            <GeolocationOnLoad
              onLocation={(pos) => {
                setMarkerPos(pos);
                setHasUserLocation(true);
              }}
              shouldPan={false}
            />
            <SearchPanner
              searchQuery={searchQuery}
              places={displayPlaces}
            />
            <CountryPanner
              selectedCountry={selectedCountry}
              isManualSelection={isManualSelection}
              disabled={!!pendingFocus}
            />
            <FocusSetup
              lat={pendingFocus?.lat ?? 0}
              lng={pendingFocus?.lng ?? 0}
              satellite={!!pendingFocus?.satellite}
              active={!!pendingFocus}
            />

            <MapPanner
              selectedId={selectedLocation?.id || null}
              position={
                selectedLocation
                  ? (() => {
                    const selected = displayPlaces.find(
                      (p: any) => p._id === selectedLocation.id,
                    );
                    const coords =
                      selected?.location?.mapLocation?.coordinates ||
                      selected?.location?.coordinates;
                    return coords?.[0] != null && coords?.[1] != null
                      ? { lat: coords[1], lng: coords[0] }
                      : null;
                  })()
                  : null
              }
              isMobile={isMobile}
            />
            {isMobile && (
              <SatelliteToggleButton position={ControlPosition.RIGHT_BOTTOM} />
            )}
            <CustomLocationButton
              onLocated={(lat, lng) => {
                setMarkerPos({ lat, lng });
                setHasUserLocation(true);
                // Temporarily pause CountryPanner so it doesn't fight the location pan
                setIsManualSelection(false);
              }}
            />

            {/* User's current location marker — subtle modern navigation puck */}
            {hasUserLocation && <UserLocationMarker position={markerPos} />}

            {/* Viewport-culled markers — avoids mounting 1000 pins for purchased maps */}
            <ViewportPlaceMarkers
              places={displayPlaces || []}
              fetchedCategories={fetchedCategories}
              selectedLocation={selectedLocation}
              setSelectedLocation={setSelectedLocation}
              isMobile={isMobile}
              visitedPlaceIds={visitedPlaceIds}
            />

            <MapControl position={ControlPosition.TOP_LEFT}>
              <div className="m-3 pointer-events-auto">
                <MapFilters
                  isMobile={isMobile}
                  fetchedCategories={fetchedCategories}
                  enabledCategories={enabledCategories}
                  fetchedPlaces={sidebarPlaces}
                  handleToggle={handleToggle}
                  setSelectedLocation={setSelectedLocation}
                  selectedLocation={selectedLocation}
                  selectedCountry={selectedCountry}
                  setSelectedCountry={handleSelectCountry}
                  setIsManualSelection={setIsManualSelection}
                  availableCountries={availableCountries}
                  availableMaps={rawMapsList}
                  isLoggedIn={isLoggedIn}
                  isMapPurchased={isCurrentMapPurchased}
                  isLoading={isSidebarLoading}
                  hideDesktopMapFilter={true}
                />
              </div>
            </MapControl>

            {!isMobile && (
              <MapControl position={ControlPosition.TOP_LEFT}>
                <div className="my-3 pointer-events-auto">
                  <SelectedMapFilter
                    selectedCountry={selectedCountry}
                    setSelectedCountry={handleSelectCountry}
                    setIsManualSelection={setIsManualSelection}
                    availableCountries={availableCountries}
                    availableMaps={rawMapsList}
                    isMobile={isMobile}
                  />
                </div>
              </MapControl>
            )}
          </Map>
        </APIProvider>

        {/* Active Search Filter Chip */}
        {searchQuery && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-white/95 dark:bg-[#111928]/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-lg border border-gray-200/80 dark:border-slate-700/80 text-xs sm:text-sm font-medium text-gray-800 dark:text-slate-200 animate-in fade-in slide-in-from-top-2">
            <span>
              {t("maps.searching", "Searching:")} <strong className="text-black dark:text-white">&ldquo;{searchQuery}&rdquo;</strong> ({displayPlaces.length})
            </span>
            <button
              type="button"
              onClick={() => router.push("/maps", { scroll: false })}
              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-500 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors"
              aria-label={t("maps.clear_search", "Clear search")}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Location Dialog Overlay */}
        {selectedLocation && (
          <LocationDialog
            id={selectedLocation}
            initialData={
              selectedLocation?.data ||
              fetchedPlaces?.find(
                (p: any) => String(p._id) === String(selectedLocation.id)
              ) || null
            }
            mapId={mapIdFilter || undefined}
            onClose={() => setSelectedLocation(null)}
          />
        )}
      </div>
    </div>
  );
}
