"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGetPlacesQuery } from "@/redux/features/place/placeApi";
import { useGetCategoriesQuery } from "@/redux/features/category/categoryApi";
import { useGetMapsQuery } from "@/redux/features/map/mapApi";
import { useGetProfileQuery } from "@/redux/features/user/userApi";
import { useGetMyVisitedPlacesQuery } from "@/redux/features/visited/visitedApi";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getLocalized } from "@/lib/utils";
import Link from "next/link";
import {
  Flame,
  MapPin,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { PlaceCard } from "./place-card";

export default function ExplorePlaces() {
  const { t, language } = useLanguage();

  const filters = [
    {
      id: "Near me",
      label: t("filters.near_me") || (language === "es" ? "Cerca de mí" : "Near me"),
      icon: MapPin,
    },
    {
      id: "Popular",
      label: t("filters.popular") || (language === "es" ? "Populares" : "Popular"),
      icon: Flame,
    },
    {
      id: "New",
      label: t("filters.new") || (language === "es" ? "Nuevos" : "New"),
      icon: Sparkles,
    },
  ];
  const { data: profile } = useGetProfileQuery({});
  const isPremium = profile && ["super_admin", "admin", "map_editor"].includes(profile.role);

  const { data: visitedRes } = useGetMyVisitedPlacesQuery(undefined, {
    skip: !profile,
  });

  const visitedPlaceIds = useMemo(() => {
    const set = new Set<string>();
    const list = visitedRes?.data || [];
    list.forEach((v: any) => {
      const pid = v.place?._id || v.place?.id || v.place || v.business?._id || v.business?.id || v.business;
      if (pid) set.add(String(pid));
    });
    return set;
  }, [visitedRes]);

  const SESSION_STORAGE_KEY = "explore_places_state";

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(45);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [enterSearching, setEnterSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [hasRestoredState, setHasRestoredState] = useState(false);
  const [savedScrollY, setSavedScrollY] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Restore saved state from sessionStorage on mount
  useEffect(() => {
    try {
      const savedStr = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        if (saved.selectedCategory !== undefined) setSelectedCategory(saved.selectedCategory);
        if (saved.activeFilter !== undefined) setActiveFilter(saved.activeFilter);
        if (saved.page !== undefined) setPage(saved.page);
        if (saved.searchTerm !== undefined) setSearchTerm(saved.searchTerm);
        if (saved.searchInput !== undefined) setSearchInput(saved.searchInput);
        if (saved.selectedCountry !== undefined && saved.selectedCountry) {
          setSelectedCountry(saved.selectedCountry);
        }
        if (typeof saved.scrollY === "number" && saved.scrollY > 0) {
          setSavedScrollY(saved.scrollY);
        }
      }
    } catch (e) {
      console.error("Failed to restore explore places state", e);
    }
    setHasRestoredState(true);
  }, []);

  const { data: categoriesResponse } = useGetCategoriesQuery({ limit: 100 });

  const getSortValue = (filterLabel: string) => {
    switch (filterLabel) {
      case "Popular":
        return "-totalReview";
      case "New":
        return "-createdAt";
      default:
        return "";
    }
  };

  const { data: mapsResponse, isLoading: isLoadingMaps } = useGetMapsQuery({
    limit: 100,
  });

  const getMapName = (m: any) => {
    if (!m) return "";
    return getLocalized(m.name, language) || m.country || getLocalized(m.name, "es") || getLocalized(m.name, "en") || "";
  };

  const selectedMapObj = mapsResponse?.data?.find(
    (m: any) =>
      getMapName(m) === selectedCountry ||
      m.country === selectedCountry ||
      m._id === selectedCountry ||
      m.name === selectedCountry
  );
  const mapIdFilter = selectedMapObj ? selectedMapObj._id : "";

  // Load country from localStorage if available
  useEffect(() => {
    if (isLoadingMaps || !mapsResponse?.data?.length) return;
    if (selectedCountry) return; // Already restored or selected
    const maps = mapsResponse.data;
    const saved = localStorage.getItem("selectedCountryFilter");
    if (saved && maps.some((m: any) => getMapName(m) === saved || m.country === saved)) {
      setSelectedCountry(saved);
    }
  }, [isLoadingMaps, mapsResponse, selectedCountry, language]);

  // Persist state to sessionStorage whenever filters change
  useEffect(() => {
    if (!hasRestoredState) return;
    try {
      const prevStr = sessionStorage.getItem(SESSION_STORAGE_KEY);
      const prev = prevStr ? JSON.parse(prevStr) : {};
      sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          ...prev,
          selectedCategory,
          activeFilter,
          page,
          searchTerm,
          searchInput,
          selectedCountry,
        })
      );
    } catch (e) {}
  }, [hasRestoredState, selectedCategory, activeFilter, page, searchTerm, searchInput, selectedCountry]);

  // Continuously keep scrollY up to date in sessionStorage
  useEffect(() => {
    const handleScroll = () => {
      try {
        const prevStr = sessionStorage.getItem(SESSION_STORAGE_KEY);
        const prev = prevStr ? JSON.parse(prevStr) : {};
        sessionStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({
            ...prev,
            scrollY: window.scrollY,
          })
        );
      } catch (e) {}
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { data: response, isLoading, isFetching } = useGetPlacesQuery({
    page,
    limit,
    searchTerm,
    sort: activeFilter && activeFilter !== "Near me" ? getSortValue(activeFilter) : "",
    map: selectedCountry ? mapIdFilter : "",
    category: selectedCategory,
    lat: activeFilter === "Near me" ? userLocation?.lat : undefined,
    lng: activeFilter === "Near me" ? userLocation?.lng : undefined,
  });

  const places = response?.data || [];
  const meta = response?.meta;
  const isWaitingForMapId =
    !!selectedCountry &&
    !mapIdFilter &&
    (isLoadingMaps ||
      !!mapsResponse?.data?.some((m: any) => m.name === selectedCountry));
  const isPlacesLoading =
    isLoading || (isFetching && !response) || isWaitingForMapId;

  // Restore scroll position after places have loaded
  useEffect(() => {
    if (!isPlacesLoading && places.length > 0 && savedScrollY !== null) {
      const timer = setTimeout(() => {
        window.scrollTo({
          top: savedScrollY,
          behavior: "instant",
        });
        setSavedScrollY(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isPlacesLoading, places.length, savedScrollY]);

  useEffect(() => {
    if (!hasRestoredState) return;
    const delayDebounceFn = setTimeout(() => {
      setSearchTerm((prev) => {
        if (prev !== searchInput) {
          setPage(1);
          return searchInput;
        }
        return prev;
      });
    }, 400); // 400ms debounce delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchInput, hasRestoredState]);

  const handleSearch = () => {
    setEnterSearching(true);
    setSearchTerm(searchInput);
    setActiveFilter(null);
    setPage(1);
  };

  useEffect(() => {
    if (!enterSearching) return;
    if (isFetching) return;
    const timer = setTimeout(() => setEnterSearching(false), 500);
    return () => clearTimeout(timer);
  }, [enterSearching, isFetching]);

  return (
    <section className="bg-gray-50 dark:bg-[#0b0f19] pt-4 pb-12 sm:pt-6 sm:pb-14 md:py-12 min-h-screen transition-colors">
      <div className="max-w-360 mx-auto px-4 md:px-6">
        {/* Title */}
        <div className="mb-3 sm:mb-4 md:mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-slate-100 tracking-tight leading-tight">
            {t("place.title") || (language === "es" ? "Lugares" : "Places")}
          </h1>
        </div>

        {/* Search */}
        <div className="mb-3 sm:mb-4 md:mb-6">
          <div className="relative w-full">
            <div className="flex items-center gap-3 bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 rounded-xl px-2 shadow-sm">
              <Search className="text-gray-400 ml-2" size={20} />

              <Input
                placeholder={t("search.search_places") || (language === "es" ? "Buscar lugares, parques o playas..." : "Search locations, parks, or beaches...")}
                className="border-none h-12 focus-visible:ring-0 shadow-none text-base text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                enterKeyHint="search"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.target as HTMLElement)?.blur();
                    setSearchFocused(false);
                    handleSearch();
                  }
                }}
              />
            </div>
            {searchFocused && searchInput.trim().length >= 2 && (
              <div className="absolute top-full z-40 mt-2 w-full overflow-hidden rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-[#131b2e]/95 backdrop-blur-xl shadow-2xl">
                {isFetching || searchInput !== searchTerm ? (
                  <div className="flex items-center justify-center gap-2 p-4 text-sm text-gray-500 dark:text-slate-400">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                    {t("common.loading")}
                  </div>
                ) : places.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto">
                    {places.slice(0, 6).map((place: any) => (
                      <button
                        key={place._id}
                        type="button"
                        className="flex w-full flex-col items-start gap-0.5 border-b border-gray-50 dark:border-slate-800/60 px-4 py-3 text-left last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/60"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSearchInput(place.name);
                          setSearchTerm(place.name);
                          setEnterSearching(true);
                          setSearchFocused(false);
                          setPage(1);
                        }}
                      >
                        <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                          {place.name}
                        </span>
                        {place.address && (
                          <span className="truncate text-xs text-gray-500 dark:text-slate-400">
                            {place.address}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-gray-500 dark:text-slate-400">
                    {t("search.no_results")}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Filters — Horizontal scrollable single row on mobile, inline wrap on desktop */}
        <div className="flex items-center gap-2.5 mb-4 sm:mb-6 md:mb-8 overflow-x-auto pt-1 pb-2.5 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap no-scrollbar">
          {/* Country Filter Selector */}
          <select
            value={selectedCountry}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedCountry(val);
              localStorage.setItem("selectedCountryFilter", val);
              setPage(1);
            }}
            className="h-10 px-3 sm:px-4 max-w-[130px] sm:max-w-[180px] truncate border border-gray-200 dark:border-slate-800 rounded-full focus:outline-none focus:ring-2 focus:ring-[#fabf13] text-sm bg-white dark:bg-[#131b2e] font-semibold text-gray-700 dark:text-slate-200 cursor-pointer shadow-sm hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <option value="">
              {t("filters.all_countries") ||
                (language === "es" ? "Todos los Países" : "All Countries")}
            </option>
            {mapsResponse?.data?.map((map: any) => {
              const nameStr = getMapName(map);
              return (
                <option key={map._id} value={nameStr}>
                  {nameStr}
                </option>
              );
            })}
          </select>

          {/* Categories Selector */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 sm:px-4 max-w-[130px] sm:max-w-[180px] truncate border border-gray-200 dark:border-slate-800 rounded-full focus:outline-none focus:ring-2 focus:ring-[#fabf13] text-sm bg-white dark:bg-[#131b2e] font-semibold text-gray-700 dark:text-slate-200 cursor-pointer shadow-sm hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <option value="">
              {t("filters.all_categories") ||
                (language === "es" ? "Todas las Categorías" : "All Categories")}
            </option>
            {categoriesResponse?.data?.map((cat: any) => (
              <option key={cat._id} value={cat._id}>
                {getLocalized(cat.name, language)}
              </option>
            ))}
          </select>

          {filters.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.id;

            return (
              <Button
                key={filter.label}
                variant={isActive ? "default" : "outline"}
                onClick={() => {
                  if (filter.id === "Near me") {
                    if (isActive) {
                      setActiveFilter(null);
                      setUserLocation(null);
                      setPage(1);
                      return;
                    }
                    if (!navigator.geolocation) {
                      toast.error(t("places.geolocation_not_supported"));
                      return;
                    }
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        setUserLocation({
                          lat: pos.coords.latitude,
                          lng: pos.coords.longitude,
                        });
                        setActiveFilter("Near me"); // use id not label
                        setPage(1);
                      },
                      () => {
                        toast.error(t("places.allow_location_access"));
                      },
                      { enableHighAccuracy: true, timeout: 10000 },
                    );
                    return;
                  }

                  setUserLocation(null);
                  setActiveFilter(isActive ? null : filter.id);
                  setPage(1);
                }}
                className={`rounded-full flex items-center gap-2 transition-all shrink-0 whitespace-nowrap ${
                  isActive
                    ? "bg-[#fabf13] text-black hover:bg-[#e0ac10] border-transparent shadow-[0_2px_12px_rgba(250,191,19,0.35)] font-bold"
                    : "dark:bg-[#131b2e] dark:border-slate-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon size={16} />
                {filter.label}
              </Button>
            );
          })}
        </div>

        {/* Premium Upgrade Banner for Free Users / Guests */}
        {!isPremium && (
          <div className="mb-8 p-4 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-500/20 dark:border-amber-500/30 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm backdrop-blur-md animate-in fade-in duration-300">
            <div className="flex items-center gap-3 text-left">
              <span className="text-2xl">✨</span>
              <div>
                <p className="font-extrabold text-gray-900 dark:text-slate-100 text-sm md:text-base">
                  {t("place.unlock_banner_title")}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                  {profile 
                    ? t("place.unlock_banner_auth_desc")
                    : t("place.unlock_banner_guest_desc")}
                </p>
              </div>
            </div>
            <Link href={profile ? "/catalog" : "/login"}>
              <Button className="bg-[#fabf13] hover:bg-[#e0ac10] text-black font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all whitespace-nowrap">
                {profile ? t("place.browse_maps") : t("place.login_to_unlock")}
              </Button>
            </Link>
          </div>
        )}

        {(isFetching || enterSearching) && (
          <p className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-slate-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
            {t("common.loading")}
          </p>
        )}

        {/* Places Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 lg:gap-8">
          {isPlacesLoading ? (
            [1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-80 bg-gray-200 dark:bg-slate-800 animate-pulse rounded-2xl"
              />
            ))
          ) : places.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-white dark:bg-[#131b2e]/60 rounded-2xl border border-dashed border-gray-300 dark:border-slate-800">
              <p className="text-xl font-semibold text-gray-400 dark:text-slate-400">
                {t("search.no_results")}
              </p>
              <Button
                variant="link"
                className="text-[#fabf13] font-bold"
                onClick={() => {
                  setSearchInput("");
                  setSearchTerm("");
                  setActiveFilter(null);
                  setUserLocation(null);
                  setSelectedCategory("");
                  const defaultCountry = mapsResponse?.data?.[0]?.name || "";
                  setSelectedCountry(defaultCountry);
                  if (defaultCountry) {
                    localStorage.setItem("selectedCountryFilter", defaultCountry);
                  } else {
                    localStorage.removeItem("selectedCountryFilter");
                  }
                  setPage(1);
                }}
              >
                {t("common.all")}
              </Button>
            </div>
          ) : (
            places.map((place: any, index: number) => {
              const purchasedMaps = Array.isArray(profile?.purchasedMaps) ? profile.purchasedMaps : [];
              const isAdminOrEditor = ["super_admin", "admin", "map_editor"].includes(profile?.role || "");
              const isBusinessLocation = (p: any) =>
                p?.type === "business" || p?.type === "Business" || p?.placeType === "Business";
              const isPurchased = isAdminOrEditor || (place?.map && purchasedMaps.some((m: any) => {
                const mid = typeof m === "object" ? (m._id || m.id) : m;
                const pmap = typeof place.map === "object" ? (place.map._id || place.map.id) : place.map;
                return String(mid) === String(pmap);
              }));

              const isLockedForUser = place.isLocked || (!isBusinessLocation(place) && !isPurchased);
              const isVisited =
                visitedPlaceIds.has(String(place._id)) ||
                (place.id ? visitedPlaceIds.has(String(place.id)) : false) ||
                Boolean(place.isVisited);

              return (
                <PlaceCard
                  key={place._id}
                  data={{ ...place, isLocked: isLockedForUser, isVisited }}
                  priority={index < 6}
                />
              );
            })
          )}
        </div>

        {/* Pagination */}
        {meta && meta.totalPage > 1 && (() => {
          const total = meta.totalPage;
          
          // Generate professional pagination range
          const getPaginationRange = (current: number, totalPages: number) => {
            const delta = 1; // Number of pages to show around current page
            const range: (number | "dots")[] = [];

            for (let i = 1; i <= totalPages; i++) {
              if (
                i === 1 ||
                i === totalPages ||
                (i >= current - delta && i <= current + delta)
              ) {
                range.push(i);
              } else if (range[range.length - 1] !== "dots") {
                range.push("dots");
              }
            }
            return range;
          };

          const pages = getPaginationRange(page, total);

          return (
            <div className="flex flex-col items-center gap-6 mt-16">
              {/* Pagination buttons */}
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-xl border-gray-200 dark:border-slate-800 dark:bg-[#131b2e] h-10 w-10 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <ChevronLeft size={16} className="text-gray-500 dark:text-slate-400" />
                </Button>

                {pages.map((p, idx) =>
                  p === "dots" ? (
                    <span
                      key={`dots-${idx}`}
                      className="flex items-center justify-center w-10 h-10 text-gray-400 dark:text-slate-600 font-medium select-none"
                    >
                      ...
                    </span>
                  ) : (
                    <Button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`h-10 min-w-[40px] rounded-xl font-medium transition-all text-sm cursor-pointer ${
                        page === p
                          ? "bg-[#3B82F6] text-white hover:bg-blue-600 shadow-sm border-[#3B82F6]"
                          : "bg-white dark:bg-[#131b2e] text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-800"
                      }`}
                    >
                      {p}
                    </Button>
                  )
                )}

                <Button
                  variant="outline"
                  size="icon"
                  disabled={page === total}
                  onClick={() => setPage((p) => Math.min(total, p + 1))}
                  className="rounded-xl border-gray-200 dark:border-slate-800 dark:bg-[#131b2e] h-10 w-10 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <ChevronRight size={16} className="text-gray-500 dark:text-slate-400" />
                </Button>
              </div>

              {/* Status and dropdown limit selector */}
              <div className="w-full max-w-[500px] flex items-center justify-between mt-2 px-2 text-sm text-gray-700 dark:text-slate-300">
                {/* Result Info */}
                <div className="font-semibold text-gray-700 dark:text-slate-300 text-base">
                  {(page - 1) * limit + 1} - {Math.min(page * limit, meta.total || 0)} / {meta.total || 0}
                </div>

                {/* Dropdown Limit Selector */}
                <div className="flex items-center gap-2">
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="bg-[#eef2f6] dark:bg-[#131b2e] text-gray-700 dark:text-slate-200 font-semibold px-4 py-2 rounded-xl border border-transparent dark:border-slate-800 focus:ring-2 focus:ring-blue-500 text-sm cursor-pointer appearance-none pr-8 relative bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%234B5563%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.65rem_auto] bg-[right_0.75rem_center] bg-no-repeat"
                  >
                    <option value={45}>45</option>
                    <option value={9}>9</option>
                    <option value={18}>18</option>
                    <option value={27}>27</option>
                  </select>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </section>
  );
}
