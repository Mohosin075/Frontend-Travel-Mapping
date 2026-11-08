"use client";
import { MapCostObserver } from "@/components/shared/maps/map-cost-observer";

import { AnimatedMapPin } from "@/components/shared/maps/animated-map-pin";
import { CustomLocationButton } from "@/components/shared/maps/CustomLocationButton";
import { LocationSearch } from "@/components/shared/maps/location-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pinMatchesSelectedMap } from "@/lib/map-country";
import { fetchGeocodeJson } from "@/lib/maps/geocode";
import { parseCoordinatesFromMapsUrl } from "@/lib/parse-maps-url";
import { useExtractCoordinatesMutation } from "@/redux/features/place/placeApi";
import { useGetMapsQuery } from "@/redux/features/map/mapApi";
import {
  APIProvider,
  Map,
  MapMouseEvent,
  useMap,
} from "@vis.gl/react-google-maps";
import { useEffect, useMemo, useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { appAlert } from "@/lib/app-alert";

interface BusinessFormStep2Props {
  form: UseFormReturn<any>;
}

interface MarkerPosition {
  lat: number;
  lng: number;
  zoom?: number;
}

type AddressInfo = {
  streetAddress: string;
  city: string;
  country: string;
};

function MapContent({
  markerPosition,
  previewPosition,
  onMapClick,
  onMarkerDragEnd,
  onMyLocation,
  mapId,
  defaultCenter,
  defaultZoom,
}: {
  markerPosition: MarkerPosition | null;
  previewPosition: MarkerPosition | null;
  onMapClick: (e: MapMouseEvent) => void | Promise<void>;
  onMarkerDragEnd: (lat: number, lng: number) => void | Promise<void>;
  onMyLocation?: (lat: number, lng: number) => void;
  mapId?: string;
  defaultCenter: { lat: number; lng: number };
  defaultZoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (markerPosition) {
      map.panTo(markerPosition);
      const zoom = map.getZoom() ?? defaultZoom;
      if (zoom < 11) map.setZoom(markerPosition.zoom || 15);
      return;
    }
    map.panTo(defaultCenter);
    map.setZoom(defaultZoom);
  }, [
    map,
    markerPosition?.lat,
    markerPosition?.lng,
    defaultCenter.lat,
    defaultCenter.lng,
    defaultZoom,
  ]);

  useEffect(() => {
    if (!map || !previewPosition) return;
    const bounds = map.getBounds();
    if (!bounds || !bounds.contains(previewPosition)) {
      map.panTo(previewPosition);
    }
  }, [map, previewPosition?.lat, previewPosition?.lng]);

  if (map) {
    map.setOptions({ draggableCursor: "crosshair" });
  }

  return (
    <Map
      style={{ width: "100%", height: "100%" }}
      defaultCenter={defaultCenter}
      defaultZoom={defaultZoom}
      minZoom={3}
      maxZoom={19}
      renderingType={"RASTER"}
      gestureHandling={"greedy"}
      disableDefaultUI={false}
      streetViewControl={false}
      mapId={mapId}
      mapTypeControl={true}
      onClick={onMapClick}
    >
      <MapCostObserver surface="business-form" />
      <CustomLocationButton onLocated={onMyLocation} />
      {markerPosition && (
        <AnimatedMapPin
          position={markerPosition}
          draggable
          onDragEnd={onMarkerDragEnd}
        />
      )}
      {previewPosition && (
        <AnimatedMapPin position={previewPosition} variant="preview" />
      )}
    </Map>
  );
}

type MapViewport = {
  southwest: { lat: number; lng: number };
  northeast: { lat: number; lng: number };
};

const googleMapsApiKey = () =>
  (process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY || "").trim();

function formatAddressLabel(address?: AddressInfo | null) {
  if (!address) return "";
  return [address.streetAddress, address.city, address.country]
    .filter(Boolean)
    .join(", ");
}

async function geocodeQuery(query: string): Promise<{
  lat: number;
  lng: number;
  country?: string;
  viewport?: MapViewport | null;
} | null> {
  const apiKey = googleMapsApiKey();
  if (!apiKey || !query) return null;

  const data = await fetchGeocodeJson(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`,
  );
  const result = data?.results?.[0];
  const loc = result?.geometry?.location;
  if (!loc) return null;
  const country = result.address_components?.find((component: any) =>
    component.types.includes("country"),
  )?.long_name;
  const viewport = result.geometry?.viewport
    ? {
        southwest: result.geometry.viewport.southwest,
        northeast: result.geometry.viewport.northeast,
      }
    : null;
  return { lat: loc.lat, lng: loc.lng, country, viewport };
}

function isInsideViewport(lat: number, lng: number, viewport?: MapViewport | null) {
  if (!viewport) return false;
  const { southwest, northeast } = viewport;
  return (
    lat >= southwest.lat &&
    lat <= northeast.lat &&
    lng >= southwest.lng &&
    lng <= northeast.lng
  );
}

async function reverseGeocode(lat: number, lng: number): Promise<AddressInfo | null> {
  const apiKey = googleMapsApiKey();
  if (!apiKey) return null;

  const data = await fetchGeocodeJson(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`,
  );
  if (!data.results?.length) return null;

  let streetAddress = "";
  let city = "";
  let country = "";

  for (const result of data.results) {
    result.address_components?.forEach((component: any) => {
      const types = component.types || [];
      if (!streetAddress && types.includes("street_number")) {
        streetAddress = `${component.long_name} `;
      }
      if (types.includes("route")) streetAddress += component.long_name;
      if (
        !city &&
        (types.includes("locality") ||
          types.includes("administrative_area_level_2") ||
          types.includes("postal_town"))
      ) {
        city = component.long_name;
      }
      if (!country && types.includes("country")) {
        country = component.long_name;
      }
    });
    if (!streetAddress && result.formatted_address) {
      streetAddress = result.formatted_address.split(",")[0];
    }
    if (country) break;
  }

  return {
    streetAddress: streetAddress.trim(),
    city,
    country,
  };
}

import { useLanguage } from "@/lib/i18n/LanguageContext";

export function BusinessFormStep2({ form }: BusinessFormStep2Props) {
  const { t } = useLanguage();
  const selectedMapName = form.watch("country");
  const savedLocation = form.watch("mapLocation");
  const savedLocationRef = useRef(savedLocation);
  useEffect(() => { savedLocationRef.current = savedLocation; }, [savedLocation]);
  const streetAddress = form.watch("streetAddress");
  const city = form.watch("city");
  const { data: mapsRes } = useGetMapsQuery({ limit: 100 });
  const selectedMap = useMemo(
    () => (mapsRes?.data || []).find((map: any) => map.name === selectedMapName),
    [mapsRes?.data, selectedMapName],
  );

  const [isExtracting, setIsExtracting] = useState(false);
  const [isCheckingPin, setIsCheckingPin] = useState(false);
  const pinRequest = useRef(0);
  useEffect(() => {
    pinRequest.current += 1;
    setIsCheckingPin(false);
    setPreviewPosition(null);
    return () => { pinRequest.current += 1; };
  }, [selectedMapName]);
  const [markerPosition, setMarkerPosition] = useState<MarkerPosition | null>(
    () => savedLocation ?? null,
  );
  const [previewPosition, setPreviewPosition] = useState<MarkerPosition | null>(
    null,
  );
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number; zoom: number } | null>(
    savedLocation
      ? { lat: savedLocation.lat, lng: savedLocation.lng, zoom: 15 }
      : null,
  );
  const countryCenterRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);

  const [expectedGeoCountry, setExpectedGeoCountry] = useState<string>("");
  const [mapViewport, setMapViewport] = useState<MapViewport | null>(null);
  const [extractCoordinates] = useExtractCoordinatesMutation();
  const apiKey = googleMapsApiKey();

  useEffect(() => {
    if (savedLocation?.lat != null && savedLocation?.lng != null) {
      setMarkerPosition(savedLocation);
      setMapCenter({ lat: savedLocation.lat, lng: savedLocation.lng, zoom: 15 });
      return;
    }
    setMarkerPosition(null);
    if (countryCenterRef.current) setMapCenter(countryCenterRef.current);
  }, [savedLocation?.lat, savedLocation?.lng]);

  useEffect(() => {
    if (!selectedMapName) return;

    let cancelled = false;
    countryCenterRef.current = null;
    setExpectedGeoCountry("");
    setMapViewport(null);
    const query = selectedMap?.country || selectedMapName;

    geocodeQuery(query).then((coords) => {
      if (cancelled) return;
      if (coords) {
        countryCenterRef.current = { lat: coords.lat, lng: coords.lng, zoom: 7 };
        if (!savedLocationRef.current) {
          setMapCenter(countryCenterRef.current);
        }
        if (coords.country) setExpectedGeoCountry(coords.country);
        setMapViewport(coords.viewport || null);
      } else {
        countryCenterRef.current = { lat: 20, lng: 0, zoom: 2 };
        if (!savedLocationRef.current) setMapCenter(countryCenterRef.current);
        setMapViewport(null);
      }
    }).catch(() => {
      if (cancelled) return;
      countryCenterRef.current = { lat: 20, lng: 0, zoom: 2 };
      if (!savedLocationRef.current) setMapCenter(countryCenterRef.current);
      setMapViewport(null);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedMapName, selectedMap?.country]);

  const resolvePin = async (
    lat: number,
    lng: number,
    request: number,
  ): Promise<{ ok: boolean; address: AddressInfo | null }> => {
    const address = await reverseGeocode(lat, lng);
    if (pinRequest.current !== request) return { ok: false, address: null };
    const pinCountry = address?.country;
    const insideSelectedMap = isInsideViewport(lat, lng, mapViewport);

    if (!pinCountry) {
      if (insideSelectedMap) return { ok: true, address };
      toast.error(t("business.verify_location_failed"));
      return { ok: false, address };
    }

    if (
      !pinMatchesSelectedMap(
        pinCountry,
        selectedMap || { name: selectedMapName },
        [expectedGeoCountry, selectedMapName],
      ) &&
      !insideSelectedMap
    ) {
      toast.error(
        `This pin is in ${pinCountry}. Place it inside ${selectedMapName}.`,
      );
      return { ok: false, address };
    }

    return { ok: true, address };
  };

  const confirmLocationChange = async (title: string, text: string) => {
    const result = await appAlert.fire({
      title,
      text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, update it",
      cancelButtonText: "Cancel",
    });
    return result.isConfirmed;
  };

  const clearLocation = async () => {
    const confirmed = await confirmLocationChange(
      "Clear this location?",
      "The current pin will be removed. You can set a new location after that.",
    );
    if (!confirmed) return;
    pinRequest.current += 1;
    setIsCheckingPin(false);
    form.setValue("mapLocation", null);
    form.setValue("mapUrl", "");
    setMarkerPosition(null);
    setPreviewPosition(null);
    toast.success(t("business.location_cleared"));
  };

  const proposeLocation = async (lat: number, lng: number) => {
    if (!selectedMapName) {
      toast.error(t("business.select_country_first"));
      return false;
    }

    const isUpdate = !!markerPosition;
    const request = ++pinRequest.current;
    setPreviewPosition({ lat, lng });
    setIsCheckingPin(true);
    let result: Awaited<ReturnType<typeof resolvePin>>;
    try {
      result = await resolvePin(lat, lng, request);
    } catch {
      if (pinRequest.current === request) {
        setPreviewPosition(null);
        toast.error(t("business.verify_location_failed"));
      }
      return false;
    } finally {
      if (pinRequest.current === request) setIsCheckingPin(false);
    }
    if (pinRequest.current !== request) return false;
    const { ok, address } = result;

    if (!ok) {
      setPreviewPosition(null);
      return false;
    }

    if (isUpdate) {
      const label = formatAddressLabel(address) || "the selected spot";
      const confirmed = await confirmLocationChange(
        t("for_business.step2.update_location_title"),
        `${t("for_business.step2.move_pin_to")} ${label}?`,
      );
      if (pinRequest.current !== request) return false;
      if (!confirmed) {
        setPreviewPosition(null);
        return false;
      }
    }

    setPreviewPosition(null);
    setMarkerPosition({ lat, lng });
    form.setValue("mapLocation", { lat, lng });
    if (address?.streetAddress) form.setValue("streetAddress", address.streetAddress);
    if (address?.city) form.setValue("city", address.city);
    toast.success(
      isUpdate
        ? `${t("for_business.step2.location_updated")} ${selectedMapName}.`
        : `${t("for_business.step2.location_set_inside")} ${selectedMapName}.`,
    );
    return true;
  };

  const handleExtractLocation = async () => {
    let url = (form.getValues("mapUrl") || "").trim();
    if (!url) {
      toast.error(t("for_business.step2.enter_url_first"));
      return;
    }
    if (!selectedMapName) {
      toast.error(t("for_business.step2.select_country_first"));
      return;
    }

    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    setIsExtracting(true);

    try {
      let extractedCoords = parseCoordinatesFromMapsUrl(url);

      if (!extractedCoords) {
        const response = await extractCoordinates({ url }).unwrap();
        const coords = response?.data || response;
        const lat = Number(coords?.lat);
        const lng = Number(coords?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          toast.error(t("for_business.step2.cannot_extract_coords"));
          return;
        }
        extractedCoords = { lat, lng };
      }

      await proposeLocation(extractedCoords.lat, extractedCoords.lng);
    } catch (error: any) {
      toast.error(
        error?.data?.message ||
          t("for_business.step2.cannot_extract_coords_full"),
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleMapClick = async (e: MapMouseEvent) => {
    if (!e.detail.latLng) return;
    await proposeLocation(e.detail.latLng.lat, e.detail.latLng.lng);
  };

  const handleMarkerDragEnd = async (lat: number, lng: number) => {
    await proposeLocation(lat, lng);
  };

  const locationLabel = [streetAddress, city, selectedMapName]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">{t("for_business.step2.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {t("for_business.step2.subtitle_prefix")}{" "}
            <span className="font-semibold text-gray-800 dark:text-slate-200">
              {selectedMapName || t("for_business.step2.selected_map_fallback")}
            </span>
            {t("for_business.step2.subtitle_suffix")}
          </p>
        </div>
        {markerPosition && (
          <Button type="button" variant="outline" onClick={clearLocation} className="border-gray-300 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200">
            {t("for_business.step2.clear_location")}
          </Button>
        )}
      </div>

      {selectedMapName && (
        <div className="rounded-xl border border-yellow-200 dark:border-yellow-900/60 bg-yellow-50 dark:bg-yellow-950/40 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-300">
          {t("for_business.step2.selected_map")} <strong>{selectedMapName}</strong>
          {t("for_business.step2.map_note")}
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-base font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
          {t("for_business.step2.google_maps_url_label")}
        </Label>
        <div className="flex gap-2">
          <Input
            placeholder={t("for_business.step2.google_maps_url_placeholder")}
            {...form.register("mapUrl")}
            className="bg-gray-50 dark:bg-slate-900/60 border-gray-200 dark:border-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
          />
          <Button
            type="button"
            onClick={handleExtractLocation}
            disabled={isExtracting || isCheckingPin}
            className="bg-yellow-400 hover:bg-yellow-500 text-black dark:text-slate-950 font-bold px-6"
          >
            {isExtracting ? "..." : markerPosition ? t("for_business.step2.update") : t("for_business.step2.add")}
          </Button>
        </div>
      </div>

      <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
        {t("for_business.step2.instructions")}
      </p>

      {markerPosition && (
        <p className="text-sm text-green-700 dark:text-green-400 font-medium">
          {t("for_business.step2.location_set")} {locationLabel || `${markerPosition.lat.toFixed(5)}, ${markerPosition.lng.toFixed(5)}`}
        </p>
      )}

      {!apiKey ? (
        <div className="flex h-[320px] items-center justify-center rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 text-center text-sm font-medium text-red-700 dark:text-red-300 sm:h-[500px]">
          {t("for_business.step2.maps_api_missing")}
        </div>
      ) : (
        <APIProvider apiKey={apiKey}>
          <div className="space-y-2">
            <LocationSearch
              countryName={selectedMapName}
              disabled={isCheckingPin || isExtracting}
              onPick={(lat, lng) => {
                void proposeLocation(lat, lng);
              }}
            />
            <div className="relative h-[320px] overflow-hidden rounded-xl border border-gray-200 dark:border-slate-800 sm:h-[500px]">
              {!mapCenter ? (
                <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-slate-900/60">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {t("for_business.step2.opening")} {selectedMapName || t("for_business.step2.map")}...
                  </p>
                </div>
              ) : (
                <MapContent
                  markerPosition={markerPosition}
                  previewPosition={previewPosition}
                  onMapClick={handleMapClick}
                  onMarkerDragEnd={handleMarkerDragEnd}
                  onMyLocation={(lat, lng) => {
                    void proposeLocation(lat, lng);
                  }}
                  mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID as string}
                  defaultCenter={{ lat: mapCenter.lat, lng: mapCenter.lng }}
                  defaultZoom={mapCenter.zoom}
                />
              )}
              {isCheckingPin && (
                <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/95 dark:bg-[#131b2e]/95 border border-transparent dark:border-slate-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-200 shadow-lg">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
                  {t("for_business.step2.checking_location")}
                </div>
              )}
            </div>
          </div>
        </APIProvider>
      )}
    </div>
  );
}
