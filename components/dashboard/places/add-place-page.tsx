"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "next-themes";
import { AddCategoryDialog } from "@/components/dashboard/categories/AddCategoryDialog";

import { CategoryIcon } from "@/components/shared/categories/category-icon";
import { CategoryMarker } from "@/components/shared/maps/category-marker";
import { CustomLocationButton } from "@/components/shared/maps/CustomLocationButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mapStyles, removeAccents } from "@/lib/utils";
import { editorCanAccessMap } from "@/lib/editor-access";
import { useGetCategoriesQuery } from "@/redux/features/category/categoryApi";
import { useGetMapsQuery } from "@/redux/features/map/mapApi";
import { useGetProfileQuery } from "@/redux/features/user/userApi";
import {
  useCreatePlaceMutation,
  useUpdatePlaceMutation,
  useExtractCoordinatesMutation,
  useLazyGetPlaceDetailsQuery,
  useDeletePlaceMutation,
} from "@/redux/features/place/placeApi";
import { useGetPublicPlacesBusinessQuery } from "@/redux/features/public/publicApi";
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { ChevronRight, Map as MapIcon, Plus, Eye, EyeOff, Search, X, ExternalLink, MapPin, Star, Phone, Globe } from "lucide-react";
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { appAlert } from "@/lib/app-alert";
import { PlaceInfoWindow } from "./PlaceInfoWindow";
import { PlaceFormContent } from "./PlaceFormContent";
import {
  asId,
  asMediaUrls,
  buildPlaceRequestBody,
  coordsChanged,
  normalizePlaceType,
} from "./place-payload";

// ─── Category color palette ────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  restaurant: "#EF4444",
  food: "#EF4444",
  cafe: "#F97316",
  coffee: "#F97316",
  hotel: "#8B5CF6",
  accommodation: "#8B5CF6",
  beach: "#06B6D4",
  nature: "#10B981",
  park: "#10B981",
  hiking: "#059669",
  shopping: "#EC4899",
  bars: "#F59E0B",
  nightlife: "#F59E0B",
};

function resolveCategoryColor(category?: any): string {
  if (!category) return "#3B82F6";
  if (category.color) return category.color;
  const name = typeof category === "object" ? category.name : category;
  if (!name || typeof name !== "string") return "#3B82F6";
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(CATEGORY_COLORS)) {
    if (key.includes(k)) return v;
  }
  return "#3B82F6";
}

// Libraries required by Google Maps components
const GOOGLE_MAP_LIBRARIES: ("places" | "geocoding" | "marker")[] = ["places", "geocoding", "marker"];

// ─── Inner component: pans to user's location once on mount ───────────────────
// Must live inside <APIProvider> so useMap() works.
function GeolocationOnLoad() {
  const map = useMap();

  useEffect(() => {
    if (!map || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      map.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  }, [map]);

  return null;
}

const getSafeString = (val: any, lang: string = "es"): string => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    return val[lang] || val.es || val.en || Object.values(val)[0] || "";
  }
  return String(val);
};

const getSearchableString = (val: any): string => {
  if (!val) return "";
  if (typeof val === "string") return removeAccents(val);
  if (typeof val === "object") {
    const en = removeAccents(val.en || "");
    const es = removeAccents(val.es || "");
    const vals = Object.values(val)
      .map((v) => removeAccents(typeof v === "string" ? v : ""))
      .join(" ");
    return `${en} ${es} ${vals}`;
  }
  return removeAccents(String(val));
};

const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number; zoom: number }> = {
  "puerto rico": { lat: 18.2208, lng: -66.5901, zoom: 10 },
  "republica dominicana": { lat: 18.7357, lng: -70.1627, zoom: 8 },
  "república dominicana": { lat: 18.7357, lng: -70.1627, zoom: 8 },
  "dominican republic": { lat: 18.7357, lng: -70.1627, zoom: 8 },
  "estados unidos": { lat: 37.0902, lng: -95.7129, zoom: 5 },
  "usa": { lat: 37.0902, lng: -95.7129, zoom: 5 },
  "united states": { lat: 37.0902, lng: -95.7129, zoom: 5 },
};

function CountryPanner({ selectedMap, language = "es" }: { selectedMap: any; language?: string }) {
  const map = useMap();
  const geocodingLib = useMapsLibrary("geocoding");

  useEffect(() => {
    if (!map || !selectedMap) return;

    const rawName = getSafeString(selectedMap.name, language).trim().toLowerCase();
    const rawCountry = (selectedMap.country || "").trim().toLowerCase();

    const preset = COUNTRY_COORDINATES[rawCountry] || COUNTRY_COORDINATES[rawName];
    if (preset) {
      map.panTo({ lat: preset.lat, lng: preset.lng });
      map.setZoom(preset.zoom);
      return;
    }

    const searchTarget = selectedMap.country || rawName;
    if (!searchTarget || !geocodingLib) return;

    const geocoder = new geocodingLib.Geocoder();
    geocoder.geocode({ address: searchTarget }, (results, status) => {
      if (status !== "OK" || !results?.[0]) return;
      const { viewport, location } = results[0].geometry;
      if (viewport) {
        map.fitBounds(viewport);
      } else if (location) {
        map.setCenter(location);
        map.setZoom(8);
      }
    });
  }, [selectedMap, map, geocodingLib, language]);

  return null;
}

function MapPanner({
  position,
}: {
  position: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (map && position && position.lat && position.lng) {
      map.panTo(position);
    }
  }, [map, position]);
  return null;
}

function GooglePoiPreviewCard({
  poi,
}: {
  poi: {
    placeId: string;
    name: string;
    address: string;
    position: { lat: number; lng: number };
    phone?: string;
    website?: string;
    rating?: number;
    userRatingsTotal?: number;
    googleUrl?: string;
    category?: string;
    photos?: string[];
  };
}) {
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0);
  const photos = poi.photos || [];

  return (
    <div className="min-w-[280px] max-w-[340px] text-gray-800 dark:text-slate-200 font-sans p-0.5">
      {/* Photos Carousel / Banner */}
      {photos.length > 0 && (
        <div className="mb-2.5 space-y-1.5">
          <div className="relative w-full h-36 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 shadow-xs border border-gray-100 dark:border-slate-800">
            <img
              src={photos[selectedPhotoIdx]}
              alt={poi.name}
              className="w-full h-full object-cover transition-opacity duration-200"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            {/* Google external link button on image */}
            {poi.googleUrl && (
              <a
                href={poi.googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-all shadow-sm"
                title="View on Google Maps"
              >
                <ExternalLink size={13} />
              </a>
            )}
            {/* Multi-photo indicator badge */}
            {photos.length > 1 && (
              <span className="absolute bottom-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-md shadow-xs">
                {selectedPhotoIdx + 1} / {photos.length}
              </span>
            )}
          </div>

          {/* Thumbnail Strip (if multiple photos) */}
          {photos.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {photos.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedPhotoIdx(idx)}
                  className={`relative shrink-0 w-11 h-9 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedPhotoIdx === idx
                      ? "border-blue-600 scale-105 shadow-xs"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={p} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Header: Title + Link (if no photos) */}
      <div className="flex items-start justify-between gap-2 pr-2">
        <h3 className="text-sm font-black text-gray-900 dark:text-slate-100 leading-snug tracking-tight">
          {poi.name}
        </h3>
        {photos.length === 0 && poi.googleUrl && (
          <a
            href={poi.googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors shrink-0"
            title="View on Google Maps"
          >
            <ExternalLink size={13} />
          </a>
        )}
      </div>

      {/* Address */}
      {poi.address && (
        <div className="flex items-start gap-1.5 mt-1 text-gray-500 dark:text-slate-400">
          <MapPin size={13} className="shrink-0 mt-0.5 text-gray-400 dark:text-slate-500" />
          <p className="text-xs leading-relaxed line-clamp-2">
            {poi.address}
          </p>
        </div>
      )}

      {/* Badges: Rating & Category */}
      {(poi.rating || poi.category) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {poi.rating && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 px-2 py-0.5 rounded-md">
              <Star size={11} className="fill-amber-500 text-amber-500" />
              <span>{poi.rating}</span>
              {poi.userRatingsTotal && (
                <span className="text-amber-600/80 dark:text-amber-400/80 font-medium">({poi.userRatingsTotal})</span>
              )}
            </span>
          )}
          {poi.category && (
            <span className="text-[11px] font-medium text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 border border-gray-200/60 dark:border-slate-700 px-2 py-0.5 rounded-md capitalize">
              {poi.category}
            </span>
          )}
        </div>
      )}

      {/* Contact info: Phone & Website */}
      {(poi.phone || poi.website) && (
        <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-wrap items-center gap-3 text-xs text-gray-600">
          {poi.phone && (
            <a
              href={`tel:${poi.phone}`}
              className="inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
              <Phone size={12} className="text-gray-400" />
              <span>{poi.phone}</span>
            </a>
          )}
          {poi.website && (
            <a
              href={poi.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline truncate max-w-[150px]"
            >
              <Globe size={12} />
              <span className="truncate">{poi.website.replace(/^https?:\/\/(www\.)?/, "")}</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function MapPlacesHandler({
  isAddingMarker,
  selectedMapId,
  onSelectCoordinates,
  onSelectGooglePlace,
  setActivePoi,
}: {
  isAddingMarker: boolean;
  selectedMapId: string | null;
  onSelectCoordinates: (pos: { lat: number; lng: number }) => void;
  onSelectGooglePlace: (data: {
    name: string;
    address: string;
    pos: { lat: number; lng: number };
    phone?: string;
    website?: string;
  }) => void;
  setActivePoi: (poi: any) => void;
}) {
  const map = useMap();
  const placesLib = useMapsLibrary("places");
  const { t } = useLanguage();

  useEffect(() => {
    if (!map) return;

    const listener = map.addListener("click", (e: any) => {
      const placeId = e.placeId;
      const lat = e.latLng?.lat() ?? 0;
      const lng = e.latLng?.lng() ?? 0;

      if (placeId) {
        // Prevent Google's default un-actionable infowindow
        if (typeof e.stop === "function") {
          e.stop();
        }

        // If in explicit "Drop Pin / Add Place" mode: directly select and open form
        if (isAddingMarker) {
          if (!selectedMapId) {
            toast.error(t("places_admin.select_map_first") || "Please select a map first!");
            return;
          }

          if (placesLib) {
            try {
              const service = new placesLib.PlacesService(map);
              service.getDetails(
                {
                  placeId,
                  fields: [
                    "name",
                    "formatted_address",
                    "geometry",
                    "formatted_phone_number",
                    "website",
                  ],
                },
                (result, status) => {
                  if (String(status) === "OK" && result) {
                    const pLat = result.geometry?.location?.lat() ?? lat;
                    const pLng = result.geometry?.location?.lng() ?? lng;
                    onSelectGooglePlace({
                      name: result.name || "",
                      address: result.formatted_address || "",
                      pos: { lat: pLat, lng: pLng },
                      phone: result.formatted_phone_number || "",
                      website: result.website || "",
                    });
                    return;
                  }
                  onSelectCoordinates({ lat, lng });
                }
              );
              return;
            } catch (err) {
              console.warn("Failed to get Google Place details:", err);
            }
          }

          onSelectCoordinates({ lat, lng });
          return;
        }

        // Otherwise (normal view mode): Fetch place details and show interactive preview card
        if (placesLib) {
          try {
            const service = new placesLib.PlacesService(map);
            service.getDetails(
              {
                placeId,
                fields: [
                  "name",
                  "formatted_address",
                  "geometry",
                  "formatted_phone_number",
                  "website",
                  "rating",
                  "user_ratings_total",
                  "url",
                  "types",
                  "photos",
                ],
              },
              (result, status) => {
                if (String(status) === "OK" && result) {
                  const pLat = result.geometry?.location?.lat() ?? lat;
                  const pLng = result.geometry?.location?.lng() ?? lng;
                  const photos = Array.isArray(result.photos)
                    ? result.photos
                        .slice(0, 5)
                        .map((p: any) =>
                          typeof p.getUrl === "function"
                            ? p.getUrl({ maxWidth: 640, maxHeight: 400 })
                            : ""
                        )
                        .filter(Boolean)
                    : [];

                  setActivePoi({
                    placeId,
                    name: result.name || "",
                    address: result.formatted_address || "",
                    position: { lat: pLat, lng: pLng },
                    phone: result.formatted_phone_number || "",
                    website: result.website || "",
                    rating: result.rating,
                    userRatingsTotal: result.user_ratings_total,
                    photos,
                    googleUrl:
                      result.url ||
                      `https://www.google.com/maps/place/?q=place_id:${placeId}`,
                    category: result.types?.[0]?.replace(/_/g, " "),
                  });
                  return;
                }
              }
            );
          } catch (err) {
            console.warn("Failed to get Google Place details:", err);
          }
        }
      } else {
        // Clicked on blank ground: dismiss any active preview card
        setActivePoi(null);
        if (!isAddingMarker) return;
        if (!selectedMapId) {
          toast.error(t("places_admin.select_map_first") || "Please select a map first!");
          return;
        }
        onSelectCoordinates({ lat, lng });
      }
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, placesLib, isAddingMarker, selectedMapId, onSelectCoordinates, onSelectGooglePlace, setActivePoi, t]);

  return null;
}

const MAX_DASHBOARD_MARKERS = 1500;

const SavedMarkersLayer = React.memo(function SavedMarkersLayer({
  places,
  selectedPlaceId,
  selectedPlace,
  draggedPositions,
  draggableMarkerId,
  animatingPins,
  findCategoryById,
  startDragTimer,
  clearDragTimer,
  setDraggableMarkerId,
  wasDraggingRef,
  setDraggedPositions,
  setAnimatingPins,
  updatePlace,
  setSelectedPlace,
  handleSelectPlace,
}: {
  places: any[];
  selectedPlaceId?: string;
  selectedPlace: any;
  draggedPositions: Record<string, { lat: number; lng: number }>;
  draggableMarkerId: string | null;
  animatingPins: Record<string, "bounce" | "shake" | null>;
  findCategoryById: (catId?: string) => any;
  startDragTimer: (id: string, e: React.PointerEvent) => void;
  clearDragTimer: () => void;
  setDraggableMarkerId: (id: string | null) => void;
  wasDraggingRef: React.MutableRefObject<boolean>;
  setDraggedPositions: React.Dispatch<React.SetStateAction<Record<string, { lat: number; lng: number }>>>;
  setAnimatingPins: React.Dispatch<React.SetStateAction<Record<string, "bounce" | "shake" | null>>>;
  updatePlace: any;
  setSelectedPlace: React.Dispatch<any>;
  handleSelectPlace: (place: any) => void;
}) {
  const map = useMap();
  const [bounds, setBounds] = useState<google.maps.LatLngBounds | null>(null);

  useEffect(() => {
    if (!map) return;
    const updateBounds = () => {
      setBounds(map.getBounds() ?? null);
    };
    updateBounds();
    // Only update bounds when map reaches idle — never mid-zoom to avoid lag
    const listener = map.addListener("idle", updateBounds);
    return () => {
      listener.remove();
    };
  }, [map]);

  const visiblePlaces = useMemo(() => {
    if (!places?.length) return [];
    if (!bounds) return places.slice(0, MAX_DASHBOARD_MARKERS);

    const inView: any[] = [];
    for (const place of places) {
      const coords =
        place?.location?.mapLocation?.coordinates ||
        place?.location?.coordinates;
      const lat = coords?.[1] || place?.latitude;
      const lng = coords?.[0] || place?.longitude;
      if (lat == null || lng == null) continue;

      if (bounds.contains({ lat, lng })) {
        inView.push(place);
        if (inView.length >= MAX_DASHBOARD_MARKERS) break;
      }
    }

    if (selectedPlaceId && !inView.some((p) => (p._id || p.id) === selectedPlaceId)) {
      const selected = places.find((p) => (p._id || p.id) === selectedPlaceId);
      if (selected) inView.unshift(selected);
    }

    return inView;
  }, [places, bounds, selectedPlaceId]);

  return (
    <>
      {visiblePlaces.map((place: any) => {
        const placeId = place._id || place.id;
        const coords =
          place?.location?.mapLocation?.coordinates ||
          place?.location?.coordinates;
        const serverPosition = {
          lat: coords?.[1] || place?.latitude,
          lng: coords?.[0] || place?.longitude,
        };
        const position = (placeId && draggedPositions[placeId]) || serverPosition;

        if (!position.lat || !position.lng) return null;

        const cat =
          typeof place.category === "object"
            ? place.category
            : findCategoryById(place.category);

        const isSelected = selectedPlace?._id === place._id;
        const isDraggable = draggableMarkerId === place._id;

        return (
          <AdvancedMarker
            key={place._id}
            position={position}
            draggable={isDraggable}
            onDragStart={() => {
              clearDragTimer();
              wasDraggingRef.current = true;
            }}
            onDragEnd={(e: any) => {
              setDraggableMarkerId(null);
              if (!e.latLng || !placeId) {
                wasDraggingRef.current = false;
                return;
              }

              const newLat = e.latLng.lat();
              const newLng = e.latLng.lng();
              const updatedPosition = { lat: newLat, lng: newLng };

              setDraggedPositions((prev) => ({
                ...prev,
                [placeId]: updatedPosition,
              }));

              appAlert.fire({
                title: "Are you sure?",
                text: "Are you sure to update location?",
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Yes, update it!",
                cancelButtonText: "No",
              }).then(async (result) => {
                if (!result.isConfirmed) {
                  setDraggedPositions((prev) => {
                    const next = { ...prev };
                    delete next[placeId];
                    return next;
                  });
                  setAnimatingPins((prev) => ({ ...prev, [placeId]: "shake" }));
                  setTimeout(() => {
                    setAnimatingPins((prev) => {
                      const next = { ...prev };
                      delete next[placeId];
                      return next;
                    });
                  }, 1000);
                  setTimeout(() => {
                    wasDraggingRef.current = false;
                  }, 200);
                  return;
                }

                const toastId = toast.loading("Saving location...");
                try {
                  const payload: any = {
                    location: {
                      type: "Point",
                      coordinates: [newLng, newLat]
                    }
                  };

                  await updatePlace({
                    id: placeId,
                    data: payload
                  }).unwrap();

                  toast.success("Location updated successfully!", { id: toastId });

                  fetch(
                    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${newLat},${newLng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY}`
                  )
                    .then((res) => res.json())
                    .then((geocodeData) => {
                      if (geocodeData.status === "OK" && geocodeData.results.length > 0) {
                        const address = geocodeData.results[0].formatted_address;
                        if (address) {
                          updatePlace({
                            id: placeId,
                            data: { address }
                          });
                          setSelectedPlace((prev: any) => {
                            if (prev && prev._id === placeId) {
                              return { ...prev, address };
                            }
                            return prev;
                          });
                        }
                      }
                    })
                    .catch((geocodeErr) => {
                      console.error("Geocoding failed during background drag save", geocodeErr);
                    });

                  setAnimatingPins((prev) => ({ ...prev, [placeId]: "bounce" }));
                  setTimeout(() => {
                    setAnimatingPins((prev) => {
                      const next = { ...prev };
                      delete next[placeId];
                      return next;
                    });
                  }, 1500);

                  setSelectedPlace((prev: any) => {
                    if (prev && prev._id === placeId) {
                      return {
                        ...prev,
                        position: updatedPosition
                      };
                    }
                    return prev;
                  });

                  setTimeout(() => {
                    wasDraggingRef.current = false;
                  }, 200);
                } catch (err: any) {
                  toast.error(err?.data?.message || "Failed to auto-save location", { id: toastId });
                  console.error("Auto-save drag failed", err);

                  setDraggedPositions((prev) => {
                    const next = { ...prev };
                    delete next[placeId];
                    return next;
                  });
                  setAnimatingPins((prev) => ({ ...prev, [placeId]: "shake" }));
                  setTimeout(() => {
                    setAnimatingPins((prev) => {
                      const next = { ...prev };
                      delete next[placeId];
                      return next;
                    });
                  }, 1000);

                  setTimeout(() => {
                    wasDraggingRef.current = false;
                  }, 200);
                }
              });
            }}
            onClick={() => {
              if (wasDraggingRef.current) {
                wasDraggingRef.current = false;
                return;
              }
              setDraggableMarkerId(null);
              handleSelectPlace(place);
            }}
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (wasDraggingRef.current) {
                  wasDraggingRef.current = false;
                  return;
                }
                setDraggableMarkerId(null);
                handleSelectPlace(place);
              }}
              onPointerDown={(e) => {
                if (e.button === 0) startDragTimer(place._id, e);
              }}
              onPointerUp={clearDragTimer}
              onPointerCancel={clearDragTimer}
              className={`
                cursor-pointer
                ${isDraggable ? "animate-bounce cursor-grab" : ""}
                ${animatingPins[placeId] === "bounce" ? "pin-anim-bounce" : ""}
                ${animatingPins[placeId] === "shake" ? "pin-anim-shake" : ""}
              `}
            >
              <CategoryMarker
                icon={cat?.icon || "📍"}
                color={resolveCategoryColor(cat)}
                name={place.name}
                isSelected={isSelected}
                status={place.status}
                size="md"
              />
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
});

export default function AddPlacePage() {
  const { t, language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  // filterCategoryId: the category clicked in the sidebar for map filtering
  // null = show all, otherwise show only places in that category
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(
    null,
  );
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Published" | "Draft">("ALL");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const defaultPosition = { lat: 23.8103, lng: 90.4125 };

  // --- API Fetches ---
  const { data: user } = useGetProfileQuery({});
  const { data: mapsRes } = useGetMapsQuery({ limit: 100 });
  const { data: categoriesRes } = useGetCategoriesQuery({ limit: 100 });
  const { data: placesRes } = useGetPublicPlacesBusinessQuery(
    {
      limit: 1000,
      map: selectedMapId || ""
    },
    { skip: !selectedMapId }
  );
  const [deletePlace] = useDeletePlaceMutation();

  const rawMaps = mapsRes?.data || [];
  const maps =
    user?.role === "map_editor"
      ? rawMaps.filter((map: any) =>
        editorCanAccessMap(user, map._id, map.country),
      )
      : rawMaps;
  const categories = categoriesRes?.data || [];
  const fetchedPlaces = Array.isArray(placesRes)
    ? placesRes
    : Array.isArray(placesRes?.data)
      ? placesRes.data
      : Array.isArray(placesRes?.data?.data)
        ? placesRes.data.data
        : [];
  const selectedMap = maps.find((m: any) => m._id === selectedMapId);


  // Track which place IDs are manually disabled (hidden from map)
  const [disabledPlaces, setDisabledPlaces] = useState<Set<string>>(new Set());
  // Track which category IDs are manually disabled (hidden from map)
  const [disabledCategories, setDisabledCategories] = useState<Set<string>>(new Set());

  const togglePlaceVisibility = (placeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDisabledPlaces((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) {
        next.delete(placeId);
      } else {
        next.add(placeId);
      }
      return next;
    });
  };

  const toggleCategoryVisibility = (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDisabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Map shows places filtered by disabled state, active category, status, and search query
  const displayPlaces = useMemo(() => {
    if (!selectedMapId) return [];
    const q = removeAccents(searchQuery.trim().toLowerCase());
    return fetchedPlaces.filter((place: any) => {
      const pCat = typeof place.category === "object" ? place.category : null;
      const pCatId = pCat ? pCat._id : place.category;

      if (disabledPlaces.has(place._id)) return false;
      if (pCatId && disabledCategories.has(pCatId)) return false;
      if (filterCategoryId && pCatId !== filterCategoryId) return false;

      if (statusFilter !== "ALL") {
        const placeStatus = place.status || "Published";
        if (placeStatus !== statusFilter) return false;
      }

      if (q) {
        const nameStr = getSearchableString(place.name);
        const addrStr = getSearchableString(place.address);
        if (!nameStr.includes(q) && !addrStr.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [selectedMapId, fetchedPlaces, disabledPlaces, disabledCategories, filterCategoryId, statusFilter, searchQuery]);

  // Pre-calculate category counts with status and search filter
  const categoriesWithPlaces = useMemo(() => {
    const q = removeAccents(searchQuery.trim().toLowerCase());
    return categories
      .map((cat: any) => {
        const placesInCat = fetchedPlaces.filter((p: any) => {
          const pCat = typeof p.category === "object" ? p.category : null;
          const pCatId = pCat ? pCat._id : p.category;
          if (pCatId !== cat._id) return false;
          if (statusFilter !== "ALL") {
            const pStatus = p.status || "Published";
            if (pStatus !== statusFilter) return false;
          }
          if (q) {
            const nameStr = getSearchableString(p.name);
            const addrStr = getSearchableString(p.address);
            if (!nameStr.includes(q) && !addrStr.includes(q)) {
              return false;
            }
          }
          return true;
        });
        return { cat, placesInCat };
      })
      .filter(
        ({ placesInCat }: { placesInCat: any[] }) => placesInCat.length > 0,
      );
  }, [categories, fetchedPlaces, statusFilter, searchQuery]);

  // --- States for Marker Management ---
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [mapUrl, setMapUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  const [tempMarker, setTempMarker] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<any | null>(null);
  const [activePoi, setActivePoi] = useState<any | null>(null);
  const [draggedPositions, setDraggedPositions] = useState<
    Record<string, { lat: number; lng: number }>
  >({});
  const [animatingPins, setAnimatingPins] = useState<
    Record<string, "bounce" | "shake" | null>
  >({});

  const [formData, setFormData] = useState({ name: "", description: "" });
  const [draggableMarkerId, setDraggableMarkerId] = useState<string | null>(null);
  const dragTimeoutRef = useRef<any>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const wasDraggingRef = useRef(false);

  const clearDragTimer = useCallback(() => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
    dragStartPosRef.current = null;
  }, []);

  const startDragTimer = useCallback((markerId: string, event: React.PointerEvent) => {
    dragStartPosRef.current = { x: event.clientX, y: event.clientY };
    if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);

    const onWindowMove = (e: PointerEvent) => {
      if (!dragStartPosRef.current) {
        window.removeEventListener("pointermove", onWindowMove);
        return;
      }
      const dx = e.clientX - dragStartPosRef.current.x;
      const dy = e.clientY - dragStartPosRef.current.y;
      if (Math.hypot(dx, dy) > 15) {
        clearDragTimer();
        window.removeEventListener("pointermove", onWindowMove);
      }
    };
    window.addEventListener("pointermove", onWindowMove);

    dragTimeoutRef.current = setTimeout(() => {
      setDraggableMarkerId(markerId);
      toast.info(t("places_admin.marker_drag_enabled") || "Marker drag enabled. Move it now!");
      dragStartPosRef.current = null;
      wasDraggingRef.current = true;
      window.removeEventListener("pointermove", onWindowMove);
    }, 500);
  }, [clearDragTimer, t]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
    };
  }, []);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);

  const updateAddressFromCoords = async (lat: number, lng: number) => {
    setIsFetchingAddress(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY}`
      );
      const data = await response.json();
      if (data.status === "OK" && data.results.length > 0) {
        const address = data.results[0].formatted_address;
        setSelectedPlace((prev: any) => (prev ? { ...prev, address } : null));
      }
    } catch (error) {
      console.error("Error fetching address:", error);
    } finally {
      setIsFetchingAddress(false);
    }
  };

  const [createPlace, { isLoading: isCreating }] = useCreatePlaceMutation();
  const [fetchPlaceDetails] = useLazyGetPlaceDetailsQuery();
  const [updatePlace, { isLoading: isUpdating }] = useUpdatePlaceMutation();
  const [extractCoordinates] = useExtractCoordinatesMutation();

  const handleExtractLocation = async () => {
    let url = mapUrl;
    if (!url) {
      toast.error(t("places_admin.enter_google_maps_url") || "Please enter a Google Maps URL first");
      return;
    }

    if (!selectedMapId) {
      toast.error(t("places_admin.select_map_first") || "Please select a map first!");
      return;
    }

    if (!url.startsWith("http")) {
      url = `https://${url}`;
    }

    setIsExtracting(true);

    try {
      const response = await extractCoordinates({ url }).unwrap();

      if (response.success && response.data) {
        const newLat = response.data.lat;
        const newLng = response.data.lng;

        setTempMarker({ lat: newLat, lng: newLng });
        setSelectedPlace({
          position: { lat: newLat, lng: newLng },
          isNew: true,
          address: "",
        });
        updateAddressFromCoords(newLat, newLng);
        setFormData({ name: "", description: "" });
        setMapUrl("");
        setIsAddingMarker(false);
        toast.success(t("places_admin.location_extracted") || "Location extracted successfully!");
      } else {
        toast.error(t("places_admin.could_not_extract") || "Could not extract coordinates from this URL.");
      }
    } catch (error: any) {
      console.error("Failed to extract location:", error);
      toast.error(
        error?.data?.message || t("places_admin.could_not_extract") || "Could not extract coordinates. Try using the full URL from your browser address bar."
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSelectCoordinates = useCallback((pos: { lat: number; lng: number }) => {
    setActivePoi(null);
    setDraggedPositions({});
    setTempMarker(pos);
    setSelectedPlace({
      position: pos,
      isNew: true,
      address: "",
    });
    updateAddressFromCoords(pos.lat, pos.lng);
    setFormData({ name: "", description: "" });
    setIsAddingMarker(false);
  }, []);

  const handleSelectGooglePlace = useCallback(
    (data: {
      name: string;
      address: string;
      pos: { lat: number; lng: number };
      phone?: string;
      website?: string;
    }) => {
      setActivePoi(null);
      setDraggedPositions({});
      setTempMarker(data.pos);
      setSelectedPlace({
        name: data.name,
        address: data.address,
        phone: data.phone || "",
        website: data.website || "",
        position: data.pos,
        isNew: true,
      });
      setFormData({ name: data.name, description: "" });
      setIsAddingMarker(false);
      toast.success(
        data.name
          ? `${t("places_admin.location_selected") || "Selected"}: ${data.name}`
          : (t("places_admin.location_selected") || "Location selected!")
      );
    },
    [t]
  );


  const handleSelectPlace = async (place: any) => {
    setActivePoi(null);
    const placeId = place._id || place.id;
    setDraggedPositions((prev) => (prev[placeId] ? { [placeId]: prev[placeId] } : {}));
    const serverPosition = {
      lat: place?.location?.coordinates?.[1] || place?.latitude || 0,
      lng: place?.location?.coordinates?.[0] || place?.longitude || 0,
    };

    // Sync marker from discovery list first (slim payload — no description)
    setSelectedPlace((prev: any) => {
      const isSamePlace = (prev?._id || prev?.id) === placeId;
      const position = (isSamePlace && prev?.position) ? prev.position : serverPosition;
      return {
        ...place,
        type: normalizePlaceType(place),
        position,
        isNew: false,
      };
    });

    const catId =
      typeof place.category === "object" ? place.category?._id : place.category;
    setSelectedCategoryId(catId || null);

    setFormData({
      name: place.name,
      description: place.description || "",
    });

    // Load full place details (description, etc.) on demand
    if (!placeId) return;
    try {
      const res = await fetchPlaceDetails(String(placeId)).unwrap();
      const full = res?.data || res;
      if (!full) return;
      const fullCatId =
        typeof full.category === "object"
          ? full.category?._id
          : full.category;
      setSelectedCategoryId(fullCatId || catId || null);
      setFormData({
        name: full.name || place.name,
        description: full.description || "",
      });
      const fullPosition = {
        lat: full?.location?.coordinates?.[1] ?? serverPosition.lat,
        lng: full?.location?.coordinates?.[0] ?? serverPosition.lng,
      };
      setSelectedPlace((prev: any) => {
        const isSamePlace = (prev?._id || prev?.id) === placeId;
        const position = (isSamePlace && prev?.position) ? prev.position : fullPosition;
        return {
          ...full,
          type: normalizePlaceType(full),
          position,
          address: prev?.address || full.address,
          isNew: false,
        };
      });
    } catch {
      // Keep slim discovery fields if detail fetch fails
    }
  };

  const handleSavePlace = async (data?: any) => {
    const finalData = data || formData;
    const placeId = selectedPlace?._id || selectedPlace?.id;
    const saveMarker =
      tempMarker ||
      (placeId && draggedPositions[placeId]) ||
      selectedPlace?.position ||
      null;

    if (!saveMarker || !selectedMapId) return;

    if (!finalData.category && !selectedCategoryId) {
      toast.error(t("places_admin.select_category_first") || "Please select a category first!");
      return;
    }

    try {
      const placeKind = normalizePlaceType(finalData);
      const nextCoords: [number, number] = [saveMarker.lng, saveMarker.lat];
      const isExisting = selectedPlace && !selectedPlace.isNew;
      const pinMoved =
        !isExisting ||
        coordsChanged(nextCoords, selectedPlace?.location?.coordinates);

      const placeData: Record<string, unknown> = {
        name: finalData.name || "Untitled Place",
        map: selectedMapId,
        category: asId(finalData.category || selectedCategoryId),
        type: placeKind,
        description: finalData.description,
        address: finalData.address || "New Address",
        status: finalData.status || "Published",
        services: finalData.services || [],
        accessibility: {
          features: finalData.accessibility
            ? Object.entries(finalData.accessibility)
              .filter(([k, v]) => v === true && k !== "notes")
              .map(([k]) => k)
            : [],
          notes: finalData.accessibility?.notes || "",
        },
        access: finalData.accessDescription || "",
        recommendations: { tips: finalData.tips || "" },
        schedules: placeKind === "Business" ? undefined : (finalData.schedules || ""),
        operatingHours: placeKind === "Business" ? (finalData.operatingHours || undefined) : undefined,
        phone: placeKind === "Business" ? (finalData.phone || "") : undefined,
        website: placeKind === "Business" ? (finalData.website || "") : undefined,
        instagram: placeKind === "Business" ? (finalData.instagram || "") : undefined,
        entryCost: finalData.entryCost || "",
        hikeTime: finalData.hikeTime || "",
        atmosphere: finalData.atmosphere || "",
        difficulty: finalData.difficulty || undefined,
        media: asMediaUrls(finalData.existingImages),
        menuImages: asMediaUrls(finalData.existingMenuImages),
      };

      const mapCountry =
        selectedMap?.country ||
        (typeof selectedMap?.name === "object"
          ? selectedMap?.name?.en || selectedMap?.name?.es
          : selectedMap?.name);

      if (mapCountry) {
        placeData.country = String(mapCountry).trim();
      } else if (selectedPlace?.country) {
        placeData.country = selectedPlace.country;
      }
      if (pinMoved) {
        placeData.location = {
          type: "Point",
          coordinates: nextCoords,
        };
      }

      const payload = buildPlaceRequestBody(
        placeData,
        finalData.mediaFiles || [],
        finalData.menuFiles || [],
      );

      if (isExisting) {
        await updatePlace({
          id: selectedPlace._id,
          data: payload,
        }).unwrap();
      } else {
        await createPlace(payload).unwrap();
      }

      toast.success(
        finalData.status === "Published"
          ? (t("places_admin.published_successfully") || "Place published successfully!")
          : (t("places_admin.saved_as_draft_successfully") || "Place saved as draft successfully!"),
      );

      setDraggedPositions({});
      setSelectedPlace(null);
      setTempMarker(null);
      setFormData({ name: "", description: "" });
      setSelectedCategoryId(null);
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to save place");
      console.error("Failed to save place:", error);
    }
  };

  const handleDeletePlace = async () => {
    if (!selectedPlace?._id) return;
    appAlert.fire({
      title: t("common.are_you_sure"),
      text: t("places_admin.delete_confirm") || "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: t("common.yes_delete_it") || "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deletePlace(selectedPlace._id).unwrap();
          toast.success(t("places_admin.deleted_successfully") || "Place deleted successfully");
          setDraggedPositions({});
          setSelectedPlace(null);
        } catch (error: any) {
          toast.error(error?.data?.message || "Failed to delete place");
        }
      }
    });
  };

  // Helper: find a category object by its _id
  const findCategoryById = (id: string | undefined) =>
    categories.find((c: any) => c._id === id);

  // The currently selected category (used for the temp marker icon)
  const activeCategory = findCategoryById(selectedCategoryId || undefined);

  return (
    <APIProvider
      apiKey={(process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY || "").trim()}
      libraries={GOOGLE_MAP_LIBRARIES}
    >
      <div className="flex h-[85vh] w-full bg-white dark:bg-[#131b2e] overflow-hidden font-sans rounded-2xl border dark:border-slate-800">
        {/* Sidebar */}
        <div className="w-80 flex flex-col border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0e1424] z-20 shadow-sm">
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-slate-100 uppercase truncate">
                  {getSafeString(selectedMap?.name, language) || selectedMap?.country || "Select a Map"}
                </h1>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                  <span>Roadtripeado Maps 9.0</span>
                </div>
              </div>

              {/* Map Selector */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest ml-1">
                  {t("places_admin.active_map")}
                </Label>
                <Select
                  value={selectedMapId || ""}
                  onValueChange={setSelectedMapId}
                >
                  <SelectTrigger className="w-full bg-gray-50 dark:bg-slate-900/60 border-gray-200 dark:border-slate-800 dark:text-slate-100">
                    <SelectValue placeholder={t("places_admin.choose_map_placeholder")} />
                  </SelectTrigger>
                  <SelectContent position="popper" style={{ zIndex: 99999 }}>
                    {maps.map((map: any) => (
                      <SelectItem key={map._id} value={map._id}>
                        <div className="flex items-center gap-2">
                          <MapIcon size={14} className="text-blue-500" />
                          <span className="truncate">{getSafeString(map.name, language) || map.country}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="space-y-2">
                <button
                  onClick={() => {
                    if (!selectedMapId) {
                      toast.error(t("places_admin.select_map_before_adding"));
                      return;
                    }
                    setIsAddingMarker((prev) => !prev);
                  }}
                  className={`w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-xs ${isAddingMarker
                    ? "bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 shadow-md"
                    : "bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
                    }`}
                >
                  <Plus size={16} className={isAddingMarker ? "text-white" : "text-blue-600 dark:text-blue-400"} />
                  <span>
                    {isAddingMarker
                      ? t("places_admin.cancel_adding_place")
                      : t("places_admin.add_place_drop_pin")}
                  </span>
                </button>

                {isAddingMarker && (
                  <div className="p-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-900/80 space-y-3 shadow-inner">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                      {t("places_admin.pin_instruction")}
                    </p>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                        {t("places_admin.google_maps_url_placeholder")}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          name="mapURL"
                          placeholder="https://maps.app.goo.gl/..."
                          value={mapUrl}
                          onChange={(e) => setMapUrl(e.target.value)}
                          className="flex-1 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-xs h-9 px-2 dark:text-slate-100 rounded-lg"
                        />
                        <Button
                          type="button"
                          onClick={handleExtractLocation}
                          disabled={isExtracting}
                          className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-3 py-1 h-9 text-xs rounded-lg shadow-sm cursor-pointer"
                        >
                          {isExtracting ? "..." : t("places_admin.add_place")}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsDialogOpen(true)}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-600 transition-all shadow-xs cursor-pointer"
              >
                <Plus size={16} className="text-amber-600 dark:text-amber-400" />
                <span>{t("places_admin.add_category")}</span>
              </button>
            </div>

            {/* Search Places Input */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                size={14}
              />
              <Input
                type="text"
                placeholder={t("places_admin.search_places") || (language === "es" ? "Buscar lugares..." : "Search places...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-gray-50 dark:bg-slate-900/60 border-gray-200 dark:border-slate-800 rounded-lg text-xs focus:bg-white dark:focus:bg-slate-900 dark:text-slate-100 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Status Filter Toggle */}
            <div className="flex bg-gray-100 dark:bg-slate-900/80 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`flex-1 py-1 rounded-md transition-all text-[11px] ${
                  statusFilter === "ALL"
                    ? "bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-sm font-bold"
                    : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
                }`}
              >
                {t("places_admin.all_status") || "All"}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("Published")}
                className={`flex-1 py-1 rounded-md transition-all text-[11px] flex items-center justify-center gap-1 ${
                  statusFilter === "Published"
                    ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm font-bold"
                    : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {t("places_admin.published") || "Published"}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("Draft")}
                className={`flex-1 py-1 rounded-md transition-all text-[11px] flex items-center justify-center gap-1 ${
                  statusFilter === "Draft"
                    ? "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-sm font-bold"
                    : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {t("places_admin.draft") || "Draft"}
              </button>
            </div>
          </div>

          {/* Categories List */}
          <div className="flex-1 overflow-y-auto px-2">
            <div className="px-4 py-2 text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest">
              {t("common.categories") || (language === "es" ? "Categorías" : "Categories")}
            </div>

            <div className="space-y-1">
              {/* Show All Toggle */}
              <button
                onClick={() => {
                  setFilterCategoryId(null);
                  setExpandedCategoryId(null);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${filterCategoryId === null
                  ? "bg-gray-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400"
                  : "text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800/40"
                  }`}
              >
                <MapIcon size={14} />
                {t("places_admin.show_all_places") || (language === "es" ? "Mostrar todos los lugares" : "Show All Places")}
              </button>

              {categoriesWithPlaces.map(({ cat, placesInCat }: { cat: any; placesInCat: any[] }) => {
                  const isFilterActive = filterCategoryId === cat._id;
                  const isExpanded = expandedCategoryId === cat._id;

                  return (
                    <div key={cat._id} className="flex flex-col">
                      <div className="flex items-center hover:bg-gray-50 dark:hover:bg-slate-800/40 rounded-lg transition-colors w-full min-w-0">
                        <button
                          onClick={() => {
                            setFilterCategoryId(cat._id);
                            setSelectedCategoryId(cat._id);
                            setExpandedCategoryId(isExpanded ? null : cat._id);
                          }}
                          className={`flex-1 flex items-center justify-between px-4 py-2.5 text-sm transition-colors min-w-0 text-left ${isFilterActive
                            ? "bg-blue-50/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold rounded-l-lg"
                            : "text-gray-600 dark:text-slate-300"
                            }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <ChevronRight
                              size={14}
                              className={`flex-shrink-0 transition-transform duration-200 ${isExpanded
                                ? "rotate-90 text-blue-500"
                                : "text-gray-300 dark:text-slate-600"
                                }`}
                            />
                            <CategoryIcon
                              icon={cat.icon}
                              size={22}
                              color={cat.color}
                            />
                            <span className="truncate pr-2">{cat.name}</span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full flex-shrink-0 ml-1">
                            {placesInCat.length}
                          </span>
                        </button>

                        {/* Category Visibility Toggle Button */}
                        <button
                          onClick={(e) => toggleCategoryVisibility(cat._id, e)}
                          title={disabledCategories.has(cat._id) ? "Show category on map" : "Hide category from map"}
                          className="px-3 py-2.5 text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0 border-l border-gray-100/50 dark:border-slate-800/60"
                        >
                          {disabledCategories.has(cat._id) ? (
                            <EyeOff size={16} className="text-gray-400 dark:text-slate-500" />
                          ) : (
                            <Eye size={16} className="text-blue-500" />
                          )}
                        </button>
                      </div>

                      {/* Expandable Place List */}
                      {isExpanded && (
                        <div className="ml-9 mt-1 mb-2 pl-4 border-l-2 border-blue-100 dark:border-blue-900/50 space-y-1 animate-in slide-in-from-top-1 duration-200">
                          {placesInCat.map((place: any) => {
                            const isDisabled = disabledPlaces.has(place._id);
                            return (
                              <div
                                key={place._id}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-all ${selectedPlace?._id === place._id
                                  ? "bg-blue-600 text-white font-bold shadow-sm"
                                  : "text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100"
                                  } ${isDisabled ? "opacity-50" : ""}`}
                              >
                                {/* Visibility checkbox */}
                                <button
                                  onClick={(e) => togglePlaceVisibility(place._id, e)}
                                  title={isDisabled ? "Show on map" : "Hide from map"}
                                  className={`flex-shrink-0 w-4 h-4 rounded border transition-colors ${isDisabled
                                    ? "border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                    : selectedPlace?._id === place._id
                                      ? "border-blue-200 bg-blue-500"
                                      : "border-gray-400 bg-blue-500"
                                    }`}
                                >
                                  {!isDisabled && (
                                    <svg viewBox="0 0 10 10" className="w-full h-full p-0.5 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
                                      <polyline points="1.5,5 4,7.5 8.5,2.5" />
                                    </svg>
                                  )}
                                </button>
                                {/* Place name button */}
                                <button
                                  onClick={() => handleSelectPlace(place)}
                                  className="flex-1 text-left min-w-0"
                                >
                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="truncate">{place.name}</span>
                                      {place.status === "Draft" ? (
                                        <span
                                          className={`text-[8.5px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider flex-shrink-0 ${
                                            selectedPlace?._id === place._id
                                              ? "bg-amber-300 text-amber-950"
                                              : "bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/20"
                                          }`}
                                        >
                                          {t("places_admin.draft") || "Draft"}
                                        </span>
                                      ) : (
                                        <span
                                          className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider flex-shrink-0 ${
                                            selectedPlace?._id === place._id
                                              ? "bg-emerald-300 text-emerald-950"
                                              : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                                          }`}
                                        >
                                          {t("places_admin.published") || "Published"}
                                        </span>
                                      )}
                                    </div>
                                    <span
                                      className={`text-[9px] ${selectedPlace?._id === place._id ? "text-blue-100" : "text-gray-400 dark:text-slate-500"}`}
                                    >
                                      {place.address
                                        ? place.address.split(",")[0]
                                        : "No address"}
                                    </span>
                                  </div>
                                </button>
                              </div>
                            );
                          })}
                          {placesInCat.length === 0 && (
                            <p className="text-[10px] text-gray-400 dark:text-slate-500 italic py-2 pl-3">
                              No places in this category yet.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* <div className="p-4 border-t border-gray-100 space-y-2">
            <button className="w-full text-left text-xs text-gray-500 hover:text-blue-600 transition-colors">
              Import places (CSV)
            </button>
            <button className="w-full text-left text-xs text-gray-500 hover:text-blue-600 transition-colors">
              Export map
            </button>
          </div> */}

          <div className="bg-gray-100 dark:bg-slate-900/90 border-t border-gray-200 dark:border-slate-800 p-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase truncate">
            Selected Map: {getSafeString(selectedMap?.name, language) || selectedMap?.country || "None"}
          </div>
        </div>

        {/* Map Area */}
        <div className="flex-1 relative">
          {/* Floating Map Status Legend */}
          <div className="absolute top-4 right-4 z-20 bg-white/95 dark:bg-[#131b2e]/95 backdrop-blur-sm px-3.5 py-1.5 rounded-xl shadow-md border border-gray-200/80 dark:border-slate-800 flex items-center gap-3 select-none pointer-events-none">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
              <span className="text-gray-700 dark:text-slate-200 font-bold text-[11px] uppercase tracking-wider">{t("places_admin.published") || "Published"}</span>
            </div>
            <div className="h-3 w-px bg-gray-200 dark:bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
              <span className="text-gray-700 dark:text-slate-200 font-bold text-[11px] uppercase tracking-wider">{t("places_admin.draft") || "Draft"}</span>
            </div>
          </div>

          <div className="w-full h-full bg-gray-200 dark:bg-slate-900">
            <Map
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
              clickableIcons={true}
              style={{ cursor: isAddingMarker ? "crosshair" : "grab" }}
            >
              {/* Pans to user's geolocation once on mount */}
              <GeolocationOnLoad />

              <CustomLocationButton />

              {/* Pans to selected country when map/country is chosen */}
              <CountryPanner selectedMap={selectedMap} language={language} />

              <MapPanner position={selectedPlace?.position} />

              {/* Map click and Google POI place selection handler */}
              <MapPlacesHandler
                isAddingMarker={isAddingMarker}
                selectedMapId={selectedMapId}
                onSelectCoordinates={handleSelectCoordinates}
                onSelectGooglePlace={handleSelectGooglePlace}
                setActivePoi={setActivePoi}
              />

              {/* ── Saved markers with Viewport & Idle Optimization (60fps zoom) ── */}
              <SavedMarkersLayer
                places={displayPlaces}
                selectedPlaceId={selectedPlace?._id}
                selectedPlace={selectedPlace}
                draggedPositions={draggedPositions}
                draggableMarkerId={draggableMarkerId}
                animatingPins={animatingPins}
                findCategoryById={findCategoryById}
                startDragTimer={startDragTimer}
                clearDragTimer={clearDragTimer}
                setDraggableMarkerId={setDraggableMarkerId}
                wasDraggingRef={wasDraggingRef}
                setDraggedPositions={setDraggedPositions}
                setAnimatingPins={setAnimatingPins}
                updatePlace={updatePlace}
                setSelectedPlace={setSelectedPlace}
                handleSelectPlace={handleSelectPlace}
              />

              {/* ── Temporary marker (not yet saved) ── */}
              {tempMarker && (
                <AdvancedMarker
                  position={tempMarker}
                  draggable={draggableMarkerId === "temp"}
                  onDragStart={() => {
                    clearDragTimer();
                  }}
                  onDragEnd={(e: any) => {
                    setDraggableMarkerId(null);
                    if (e.latLng) {
                      const newLat = e.latLng.lat();
                      const newLng = e.latLng.lng();
                      setTempMarker({ lat: newLat, lng: newLng });
                      setSelectedPlace({
                        position: { lat: newLat, lng: newLng },
                        isNew: true,
                        address: "",
                      });
                      updateAddressFromCoords(newLat, newLng);
                    }
                  }}
                  onClick={() =>
                    setSelectedPlace({
                      position: tempMarker,
                      isNew: true,
                      address: selectedPlace?.address || "",
                    })
                  }
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlace({
                        position: tempMarker,
                        isNew: true,
                        address: selectedPlace?.address || "",
                      });
                    }}
                    onPointerDown={(e) => {
                      if (e.button === 0) startDragTimer("temp", e);
                    }}
                    onPointerUp={clearDragTimer}
                    onPointerCancel={clearDragTimer}
                    className={`cursor-pointer ${draggableMarkerId === "temp" ? "animate-bounce cursor-grab" : ""}`}
                  >
                    <CategoryMarker
                      icon={activeCategory?.icon || "📍"}
                      color={resolveCategoryColor(activeCategory)}
                      isTemp={true}
                      isSelected={true}
                      status="Draft"
                      size="md"
                    />
                  </div>
                </AdvancedMarker>
              )}

              {/* ── Google POI Preview InfoWindow with Photos & Details ── */}
              {activePoi && (
                <InfoWindow
                  position={activePoi.position}
                  onCloseClick={() => setActivePoi(null)}
                  pixelOffset={[0, -8]}
                >
                  <GooglePoiPreviewCard key={activePoi.placeId} poi={activePoi} />
                </InfoWindow>
              )}

            </Map>
          </div>
        </div>

        {/* ── Modal overlay for new or existing place (prevents Google Maps canvas lag) ── */}
        {selectedPlace && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200"
          >
            <div
              className="relative w-full max-w-5xl h-[85vh] max-h-[780px] min-h-[580px] bg-white dark:bg-[#131b2e] rounded-2xl shadow-2xl overflow-hidden flex flex-col border dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b dark:border-slate-800 bg-white dark:bg-[#131b2e] shrink-0 z-20">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-slate-100">
                    {selectedPlace.isNew
                      ? (t("places_admin.add_place") || "Add Place")
                      : (t("places_admin.update_place") || "Update Place")}
                  </h2>
                  <span
                    className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                      selectedPlace.isNew || selectedPlace.status === "Draft"
                        ? "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-500/20"
                        : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/20"
                    }`}
                  >
                    {selectedPlace.isNew || selectedPlace.status === "Draft"
                      ? (t("places_admin.draft") || "Draft")
                      : (t("places_admin.published") || "Published")}
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (isCreating || isUpdating) {
                      toast.warning(t("places.upload_in_progress"));
                      return;
                    }
                    setDraggedPositions({});
                    if (selectedPlace.isNew) {
                      setTempMarker(null);
                    }
                    setSelectedPlace(null);
                  }}
                  className="rounded-full p-1 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Place Form Content */}
              <PlaceFormContent
                key={
                  selectedPlace._id ||
                  `new-${selectedPlace.position?.lat}-${selectedPlace.position?.lng}-${selectedPlace.name || ""}`
                }
                categories={categories}
                onSave={handleSavePlace}
                isSaving={isCreating || isUpdating}
                isFetchingAddress={isFetchingAddress}
                onClose={() => {
                  setDraggedPositions({});
                  if (selectedPlace.isNew) {
                    setTempMarker(null);
                  }
                  setSelectedPlace(null);
                }}
                onDelete={handleDeletePlace}
                initialData={{
                  ...selectedPlace,
                  category:
                    selectedCategoryId ||
                    (typeof selectedPlace.category === "object"
                      ? selectedPlace.category?._id
                      : selectedPlace.category) ||
                    "",
                  type: normalizePlaceType(selectedPlace),
                  phone: selectedPlace.phone || "",
                  website: selectedPlace.website || "",
                  instagram: selectedPlace.instagram || "",
                  address: selectedPlace.address || "",
                  accessDescription:
                    selectedPlace.access || selectedPlace.details?.access || "",
                  tips:
                    selectedPlace.recommendations?.tips ||
                    selectedPlace.details?.recommendations ||
                    "",
                  services: selectedPlace.services || [],
                  accessibility: {
                    wheelchair:
                      (selectedPlace.accessibility?.features || []).includes("wheelchair") ||
                      !!selectedPlace.accessibility?.wheelchair,
                    children:
                      (selectedPlace.accessibility?.features || []).includes("children") ||
                      !!selectedPlace.accessibility?.children,
                    pets:
                      (selectedPlace.accessibility?.features || []).includes("pets") ||
                      !!selectedPlace.accessibility?.pets,
                    senior:
                      (selectedPlace.accessibility?.features || []).includes("senior") ||
                      !!selectedPlace.accessibility?.senior,
                    notes: selectedPlace.accessibility?.notes || "",
                  },
                  schedules: selectedPlace.schedules || "",
                  entryCost:
                    selectedPlace.entryCost !== undefined && selectedPlace.entryCost !== null
                      ? String(selectedPlace.entryCost)
                      : "",
                  hikeTime:
                    selectedPlace.hikeTime !== undefined && selectedPlace.hikeTime !== null
                      ? String(selectedPlace.hikeTime)
                      : "",
                  atmosphere: selectedPlace.atmosphere || "",
                  difficulty: selectedPlace.difficulty || "",
                  operatingHours: selectedPlace.operatingHours || undefined,
                  images: asMediaUrls(selectedPlace.media),
                  menuImages: asMediaUrls(selectedPlace.menuImages),
                  status: selectedPlace.status || (selectedPlace.isNew ? "Draft" : undefined),
                  isNew: selectedPlace.isNew,
                }}
              />
            </div>
          </div>
        )}

        <AddCategoryDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes pin-shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-6px); }
            40%, 80% { transform: translateX(6px); }
          }
          @keyframes pin-bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-16px); }
          }
          .pin-anim-shake {
            animation: pin-shake 0.4s ease-in-out;
          }
          .pin-anim-bounce {
            animation: pin-bounce 0.5s ease-in-out 2;
          }
        `}} />
      </div>
    </APIProvider>
  );
}
