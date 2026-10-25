"use client";

import { HIDE_GOOGLE_POI_STYLES } from "@/components/Common/maps/map";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  X,
  Plus,
  MapPin,
  Check,
  Layers,
  Map as MapIcon,
  List,
  Sparkles,
  RotateCcw,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { useGetPlacesQuery } from "@/redux/features/place/placeApi";
import { useGetCategoriesQuery } from "@/redux/features/category/categoryApi";
import { useGetMapsQuery } from "@/redux/features/map/mapApi";
import { useGetProfileQuery } from "@/redux/features/user/userApi";
import { SafeImage } from "@/components/shared/safe-image";
import { NoImage } from "@/lib/others/others";
import { getUsableMediaUrl, getLocalized } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { CategoryIcon } from "@/components/shared/categories/category-icon";
import {
  Map,
  AdvancedMarker,
} from "@vis.gl/react-google-maps";
import { useTheme } from "next-themes";

interface AddStopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlace: (place: any) => void;
  selectedPlaceIds?: string[];
}

function extractCoords(place: any): { lat: number; lng: number } | null {
  const coords =
    place?.location?.coordinates ||
    place?.location?.mapLocation?.coordinates ||
    place?.coordinates;

  let lat: number | undefined;
  let lng: number | undefined;

  if (Array.isArray(coords) && coords.length >= 2) {
    lng = Number(coords[0]);
    lat = Number(coords[1]);
  } else if (coords && typeof coords === "object") {
    lat = Number((coords as any).lat ?? (coords as any).latitude);
    lng = Number((coords as any).lng ?? (coords as any).longitude);
  }

  if (lat == null || Number.isNaN(lat) || lat === 0) {
    lat = Number(place?.latitude ?? place?.lat ?? place?.location?.latitude);
  }
  if (lng == null || Number.isNaN(lng) || lng === 0) {
    lng = Number(place?.longitude ?? place?.lng ?? place?.location?.longitude);
  }

  if (!lat || !lng || Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

export default function AddStopModal({
  isOpen,
  onClose,
  onSelectPlace,
  selectedPlaceIds = [],
}: AddStopModalProps) {
  const { t, language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [onlyUnadded, setOnlyUnadded] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [activePinPlace, setActivePinPlace] = useState<any | null>(null);

  // Categories & Maps Queries
  const { data: categoriesRes } = useGetCategoriesQuery(
    { limit: 100 },
    { skip: !isOpen }
  );

  const { data: mapsRes, isLoading: isLoadingMaps } = useGetMapsQuery(
    { limit: 100 },
    { skip: !isOpen }
  );

  const categories = categoriesRes?.data?.data || categoriesRes?.data || [];
  const mapsList = mapsRes?.data?.data || mapsRes?.data || [];

  const getMapName = (m: any) => {
    if (!m) return "";
    return (
      getLocalized(m.name, language) ||
      m.country ||
      getLocalized(m.name, "es") ||
      getLocalized(m.name, "en") ||
      ""
    );
  };

  // Default to empty (all places/regions in Puerto Rico) so all pins appear

  const selectedMapObj = mapsList.find(
    (m: any) =>
      getMapName(m) === selectedCountry ||
      m.country === selectedCountry ||
      (m._id || m.id) === selectedCountry ||
      m.name === selectedCountry
  );
  const mapIdFilter = selectedMapObj ? (selectedMapObj._id || selectedMapObj.id) : "";

  // Places Query
  const { data: placesRes, isLoading } = useGetPlacesQuery(
    {
      page: 1,
      limit: 2500,
      searchTerm,
      category: selectedCategory !== "all" ? selectedCategory : "",
      map: mapIdFilter,
      status: "Published",
    },
    { skip: !isOpen }
  );

  // User profile & map ownership check
  const { data: profileRes } = useGetProfileQuery({}, { skip: !isOpen });
  const profile = profileRes?.data || profileRes;
  const purchasedMaps = useMemo(() => {
    return Array.isArray(profile?.purchasedMaps) ? profile.purchasedMaps : [];
  }, [profile?.purchasedMaps]);
  const isAdminOrEditor = ["super_admin", "admin", "map_editor"].includes(profile?.role || "");

  const isBusinessLocation = (p: any) =>
    p?.type === "business" || p?.type === "Business" || p?.placeType === "Business";

  const isPlaceAccessible = (place: any) => {
    if (isAdminOrEditor) return true;
    if (isBusinessLocation(place)) return true;

    const pMapId = typeof place?.map === "object" ? (place?.map?._id || place?.map?.id) : place?.map;
    if (!pMapId) return true;

    const mapObj = mapsList.find((m: any) => String(m._id || m.id) === String(pMapId));
    if (mapObj && mapObj.isPaid === false) return true;

    const isPurchased = purchasedMaps.some((m: any) => {
      const mid = typeof m === "object" ? (m._id || m.id) : m;
      return String(mid) === String(pMapId);
    });

    return isPurchased;
  };

  // Filter places based on unadded toggle if enabled and compute isLocked
  const places = useMemo(() => {
    const rawPlaces = placesRes?.data?.data || placesRes?.data || [];
    const filtered = onlyUnadded
      ? rawPlaces.filter((p: any) => !selectedPlaceIds.includes(p._id || p.id))
      : rawPlaces;

    return filtered.map((p: any) => {
      const isLocked = !isPlaceAccessible(p);
      return {
        ...p,
        isLocked,
      };
    });
  }, [placesRes, onlyUnadded, selectedPlaceIds, isAdminOrEditor, mapsList, purchasedMaps]);

  const activeFiltersCount =
    (selectedCategory !== "all" ? 1 : 0) +
    (selectedCountry ? 1 : 0) +
    (searchTerm ? 1 : 0) +
    (onlyUnadded ? 1 : 0);

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedCountry("");
    setOnlyUnadded(false);
  };

  if (!isOpen) return null;

  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "2b83d15fbb74673e997cfde8";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md transition-opacity animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#131b2e] rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col h-[94vh] sm:h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-gray-100 dark:border-slate-800/80 flex items-center justify-between flex-shrink-0 bg-white/95 dark:bg-[#131b2e]/95 backdrop-blur-md">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center text-amber-500 dark:text-amber-400 flex-shrink-0">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-gray-950 dark:text-white tracking-tight line-clamp-1">
                {t("route_planner.add_stop_title") || "Añadir parada a tu ruta"}
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-slate-400">
                {places.length}{" "}
                {places.length === 1
                  ? t("route_planner.places_available_one") || "lugar disponible"
                  : t("route_planner.places_available_many") || "lugares disponibles"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle (List / Map) */}
            <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "list"
                    ? "bg-white dark:bg-[#131b2e] text-gray-950 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-slate-400 hover:text-gray-900"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t("route_planner.tab_list") || "Lista"}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "map"
                    ? "bg-white dark:bg-[#131b2e] text-gray-950 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-slate-400 hover:text-gray-900"
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t("route_planner.tab_map") || "Mapa"}</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar Section — Organized exactly like Places page */}
        <div className="px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 flex-shrink-0 space-y-3">
          {/* Search Bar (Matching Places page layout) */}
          <div className="relative w-full">
            <div className="flex items-center gap-3 bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 rounded-xl px-2 shadow-sm focus-within:border-[#fabf13] focus-within:ring-1 focus-within:ring-[#fabf13] transition-all">
              <Search className="text-gray-400 ml-2" size={18} />
              <input
                type="text"
                placeholder={t("search.search_places") || "Buscar lugares en Puerto Rico..."}
                className="w-full border-none h-10 sm:h-11 bg-transparent focus:outline-none text-xs sm:text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="p-1 mr-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Filters Bar: Country section, Category section & Category pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-2 px-2 sm:mx-0 sm:px-0 no-scrollbar">
            {/* Country Section Dropdown (Organized like Places page) */}
            <select
              value={selectedCountry}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCountry(val);
                try {
                  localStorage.setItem("selectedCountryFilter", val);
                } catch {}
              }}
              className="h-9 sm:h-10 px-3 sm:px-4 max-w-[130px] sm:max-w-[170px] truncate border border-gray-200 dark:border-slate-800 rounded-full focus:outline-none focus:ring-2 focus:ring-[#fabf13] text-xs sm:text-sm bg-white dark:bg-[#131b2e] font-semibold text-gray-700 dark:text-slate-200 cursor-pointer shadow-sm hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              <option value="">{t("filters.all_countries") || "Todos los países"}</option>
              {mapsList.map((map: any) => {
                const nameStr = getMapName(map);
                return (
                  <option key={map._id || map.id} value={nameStr}>
                    {nameStr}
                  </option>
                );
              })}
            </select>

            {/* Category Dropdown (Organized like Places page) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {(() => {
                const activeCatObj = categories.find((c: any) => (c._id || c.id) === selectedCategory);
                if (!activeCatObj?.icon) return null;
                const isCustom =
                  activeCatObj.icon.startsWith("http") ||
                  activeCatObj.icon.startsWith("data:") ||
                  activeCatObj.icon.includes("/") ||
                  activeCatObj.icon.includes(".");
                return (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-xs border border-gray-200 dark:border-slate-700"
                    style={{
                      backgroundColor: isCustom ? "transparent" : activeCatObj.color || "#FA7B17",
                    }}
                  >
                    <CategoryIcon icon={activeCatObj.icon} size={15} color="#FFFFFF" />
                  </div>
                );
              })()}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-9 sm:h-10 px-3 sm:px-4 max-w-[140px] sm:max-w-[180px] truncate border border-gray-200 dark:border-slate-800 rounded-full focus:outline-none focus:ring-2 focus:ring-[#fabf13] text-xs sm:text-sm bg-white dark:bg-[#131b2e] font-semibold text-gray-700 dark:text-slate-200 cursor-pointer shadow-sm hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              >
                <option value="all">{t("filters.all_categories") || "Todas las categorías"}</option>
                {categories.map((cat: any) => (
                  <option key={cat._id || cat.id} value={cat._id || cat.id}>
                    {getLocalized(cat.name, language)}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle: Only show spots not in route */}
            <button
              type="button"
              onClick={() => setOnlyUnadded(!onlyUnadded)}
              className={`h-9 sm:h-10 px-3 rounded-full font-bold text-xs sm:text-sm whitespace-nowrap flex items-center gap-1.5 transition-all shrink-0 ${
                onlyUnadded
                  ? "bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-400/50"
                  : "bg-white dark:bg-[#131b2e] text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-800 hover:border-[#fabf13]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{t("route_planner.filter_available_only") || "Solo no añadidos"}</span>
            </button>

            {/* Reset Filters button if active */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="h-9 sm:h-10 px-3 rounded-full font-bold text-xs sm:text-sm whitespace-nowrap text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1.5 transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t("route_planner.clear_filters_btn") || "Limpiar"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden relative">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-3 border-[#fabf13] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">
                {t("common.loading") || "Cargando lugares..."}
              </p>
            </div>
          ) : viewMode === "list" ? (
            /* LIST VIEW */
            <div className="h-full overflow-y-auto px-4 sm:px-6 py-4">
              {places.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400 dark:text-slate-500">
                  <MapPin className="w-12 h-12 mx-auto mb-2 opacity-40 text-amber-500" />
                  <p className="text-base font-bold text-gray-700 dark:text-slate-300">
                    {t("route_planner.no_places_found") ||
                      "No se encontraron lugares"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                    {t("route_planner.try_different_filters") ||
                      "Intenta cambiar los filtros o buscar con otro término."}
                  </p>
                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="mt-3 px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 text-xs font-bold text-gray-800 dark:text-slate-200"
                    >
                      {t("route_planner.clear_filters_btn") || "Limpiar filtros"}
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-8">
                  {places.map((place: any) => {
                    const placeId = place._id || place.id;
                    const isSelected = selectedPlaceIds.includes(placeId);
                    const isLocked = Boolean(place.isLocked);
                    const pMapId = typeof place.map === "object" ? (place.map?._id || place.map?.id) : place.map;
                    const cover = getUsableMediaUrl(place.media);
                    const placeName = isLocked
                      ? t("map.premium_location", "Premium Location")
                      : getLocalized(place.name, language);
                    const catName = getLocalized(place.category?.name, language);
                    const catIcon = place.category?.icon;
                    const isCustomCatImg =
                      catIcon?.startsWith("http") ||
                      catIcon?.startsWith("data:") ||
                      catIcon?.includes("/") ||
                      catIcon?.includes(".");

                    return (
                      <div
                        key={placeId}
                        onClick={() => {
                          if (isLocked) {
                            if (typeof window !== "undefined") {
                              window.location.href = pMapId ? `/catalog/${pMapId}` : "/catalog";
                            }
                            return;
                          }
                          if (!isSelected) onSelectPlace(place);
                        }}
                        className={`group flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                          isLocked
                            ? "bg-slate-50/70 dark:bg-slate-900/40 border-gray-200 dark:border-slate-800/80 hover:border-amber-400/60"
                            : isSelected
                            ? "bg-amber-500/5 dark:bg-amber-500/10 border-[#fabf13]/50 ring-1 ring-[#fabf13]/40"
                            : "bg-white dark:bg-[#151e33] border-gray-100 dark:border-slate-800 hover:border-[#fabf13] hover:shadow-md"
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-slate-800">
                          {cover ? (
                            <div
                              className={`w-full h-full relative ${
                                isLocked ? "select-none pointer-events-none" : "group-hover:scale-105"
                              } transition-transform duration-300`}
                              style={
                                isLocked
                                  ? {
                                      filter: "blur(14px)",
                                      WebkitFilter: "blur(14px)",
                                      transform: "scale(1.15)",
                                    }
                                  : undefined
                              }
                            >
                              <SafeImage
                                src={cover}
                                alt={placeName}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <NoImage />
                          )}
                          {isLocked && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <Lock className="w-5 h-5 text-[#fabf13] drop-shadow-md" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 pr-1">
                          {catName && (
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {catIcon && (
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                                  style={{
                                    backgroundColor: isCustomCatImg
                                      ? "transparent"
                                      : place.category?.color || "#FA7B17",
                                  }}
                                >
                                  <CategoryIcon
                                    icon={catIcon}
                                    size={13}
                                    color="#FFFFFF"
                                  />
                                </div>
                              )}
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider truncate">
                                {catName}
                              </span>
                            </div>
                          )}
                          <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate group-hover:text-[#fabf13] transition-colors flex items-center gap-1.5">
                            {isLocked && <Lock className="w-3.5 h-3.5 text-[#fabf13] shrink-0" />}
                            <span>{placeName}</span>
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                            <span className="truncate">
                              {isLocked
                                ? (typeof place.map === "object" ? getLocalized(place.map?.name, language) : "") || place.country || "Puerto Rico"
                                : (place.address || "Puerto Rico")}
                            </span>
                          </p>
                        </div>

                        {/* Add or Buy Button */}
                        {isLocked ? (
                          <Link
                            href={pMapId ? `/catalog/${pMapId}` : "/catalog"}
                            onClick={(e) => e.stopPropagation()}
                            className="h-8 px-2.5 rounded-xl bg-amber-500/15 hover:bg-[#fabf13] hover:text-gray-950 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center gap-1 transition-all shrink-0 border border-amber-500/30"
                            title={t("map.buy_map") || "Comprar mapa"}
                          >
                            <Lock className="w-3 h-3" />
                            <span className="hidden sm:inline">{t("map.buy_map") || "Comprar"}</span>
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isSelected) onSelectPlace(place);
                            }}
                            title={
                              isSelected
                                ? t("route_planner.in_your_route") || "En tu ruta"
                                : t("route_planner.add_place_btn") || "Añadir"
                            }
                            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                              isSelected
                                ? "bg-[#fabf13] text-gray-950 font-bold shadow-md"
                                : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 group-hover:bg-[#fabf13] group-hover:text-gray-950"
                            }`}
                          >
                            {isSelected ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : (
                              <Plus className="w-4 h-4 stroke-[2.5]" />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* MAP VIEW */
            <div className="h-full w-full relative">
              <Map
                colorScheme={isDark ? "DARK" : "LIGHT"}
                defaultCenter={{ lat: 18.2208, lng: -66.5901 }}
                defaultZoom={10}
                minZoom={6}
                maxZoom={18}
                renderingType="RASTER"
                mapId={mapId}
                disableDefaultUI={false}
                gestureHandling="greedy"
                className="w-full h-full"
              >
                {places.map((place: any) => {
                  const placeId = place._id || place.id;
                  const pos = extractCoords(place);
                  if (!pos) return null;

                  const isSelected = selectedPlaceIds.includes(placeId);
                  const isLocked = Boolean(place.isLocked);
                  const isCurrentActive =
                    activePinPlace && (activePinPlace._id || activePinPlace.id) === placeId;

                  return (
                    <AdvancedMarker
                      key={placeId}
                      position={pos}
                      onClick={() => setActivePinPlace(place)}
                    >
                      <div
                        title={isLocked ? (language === "es" ? "Ubicación Premium" : "Premium Location") : getLocalized(place.name, language)}
                        className={`relative flex items-center justify-center cursor-pointer transition-all duration-200 transform select-none ${
                          isCurrentActive ? "scale-125 z-40" : "hover:scale-115 z-10"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 transition-all ${
                            isSelected
                              ? "bg-[#fabf13] text-gray-950 border-white ring-2 ring-[#fabf13]/50 shadow-amber-500/30"
                              : isLocked
                              ? "bg-slate-900 text-amber-400 border-amber-400 shadow-md"
                              : "bg-white dark:bg-[#131b2e] text-amber-500 border-amber-400 dark:border-amber-400/80 hover:border-amber-500"
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-4.5 h-4.5 stroke-[3]" />
                          ) : isLocked ? (
                            <Lock className="w-4 h-4 text-amber-400" />
                          ) : place.category?.icon ? (
                            <CategoryIcon
                              icon={place.category.icon}
                              size={19}
                              color={isDark ? "#fbbf24" : "#d97706"}
                            />
                          ) : (
                            <MapPin className="w-4.5 h-4.5" />
                          )}
                        </div>

                        {/* Marker Pin Tail */}
                        <div
                          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 rounded-[1px] transition-colors ${
                            isSelected
                              ? "bg-[#fabf13]"
                              : isLocked
                              ? "bg-slate-900 border-r-2 border-b-2 border-amber-400"
                              : "bg-white dark:bg-[#131b2e] border-r-2 border-b-2 border-amber-400 dark:border-amber-400/80"
                          }`}
                        />
                      </div>
                    </AdvancedMarker>
                  );
                })}
              </Map>

              {/* Floating Active Place Preview Card on Map */}
              {activePinPlace && (() => {
                const isLocked = Boolean(activePinPlace.isLocked);
                const pMapId = typeof activePinPlace.map === "object" ? (activePinPlace.map?._id || activePinPlace.map?.id) : activePinPlace.map;
                const activeCover = getUsableMediaUrl(activePinPlace.media);
                const activeDisplayName = isLocked
                  ? t("map.premium_location", "Premium Location")
                  : getLocalized(activePinPlace.name, language);

                return (
                  <div className="absolute bottom-4 left-4 right-4 z-20 max-w-sm mx-auto animate-in slide-in-from-bottom-2 duration-200">
                    <div className="bg-white/95 dark:bg-[#131b2e]/95 backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-gray-200 dark:border-slate-800 flex items-center gap-3">
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-slate-800">
                        {activeCover ? (
                          <div
                            className={`w-full h-full relative ${
                              isLocked ? "select-none pointer-events-none" : ""
                            }`}
                            style={
                              isLocked
                                ? {
                                    filter: "blur(14px)",
                                    WebkitFilter: "blur(14px)",
                                    transform: "scale(1.15)",
                                  }
                                : undefined
                            }
                          >
                            <SafeImage
                              src={activeCover}
                              alt={activeDisplayName}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <NoImage />
                        )}
                        {isLocked && (
                          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-[#fabf13] drop-shadow-md" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 truncate">
                            {activePinPlace.category?.icon && (
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                                style={{
                                  backgroundColor: activePinPlace.category.color || "#FA7B17",
                                }}
                              >
                                <CategoryIcon
                                  icon={activePinPlace.category.icon}
                                  size={13}
                                  color="#FFFFFF"
                                />
                              </div>
                            )}
                            <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 truncate">
                              {getLocalized(activePinPlace.category?.name, language) || "Lugar"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActivePinPlace(null)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100 truncate flex items-center gap-1">
                          {isLocked && <Lock className="w-3 h-3 text-[#fabf13] shrink-0" />}
                          <span>{activeDisplayName}</span>
                        </h4>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate mt-0.5">
                          {isLocked
                            ? (typeof activePinPlace.map === "object" ? getLocalized(activePinPlace.map?.name, language) : "") || activePinPlace.country || "Puerto Rico"
                            : (activePinPlace.address || "Puerto Rico")}
                        </p>

                        <div className="mt-2">
                          {isLocked ? (
                            <Link
                              href={pMapId ? `/catalog/${pMapId}` : "/catalog"}
                              onClick={() => setActivePinPlace(null)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#fabf13] hover:bg-[#e0ac10] text-gray-950 font-bold text-xs transition-colors shadow-sm"
                            >
                              <Lock className="w-3 h-3" />
                              <span>{t("map.buy_map") || "Comprar mapa"}</span>
                            </Link>
                          ) : selectedPlaceIds.includes(activePinPlace._id || activePinPlace.id) ? (
                            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>{t("route_planner.in_your_route") || "En tu ruta"}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectPlace(activePinPlace);
                                setActivePinPlace(null);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#fabf13] hover:bg-[#e0ac10] text-gray-950 font-bold text-xs transition-colors shadow-sm"
                            >
                              <Plus className="w-3 h-3 stroke-[3]" />
                              <span>{t("route_planner.add_place_btn") || "Añadir a la ruta"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
