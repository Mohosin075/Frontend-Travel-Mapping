"use client";

import { Input } from "@/components/ui/input";
import { NoImage } from "@/lib/others/others";
import { getImageUrl, getLocalized } from "@/lib/utils";
import {
  useGetMyVisitedPlacesQuery,
  useToggleVisitedMutation,
} from "@/redux/features/visited/visitedApi";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { CountryFilter, useCountryFilter } from "@/components/shared/country-filter";

const PAGE_SIZE = 12;

export default function VisitedPlaces() {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState("all");
  const [page, setPage] = useState(1);
  const countryFilter = useCountryFilter();

  const TYPE_FILTERS = [
    { label: t("common.all") || "All", value: "all" },
    { label: t("nav.places") || "Places", value: "Place", icon: MapPin },
    { label: t("dashboard.sidebar.business") || "Business", value: "Business", icon: Building2 },
  ];

  const { currentData: visitedRes, isFetching: isLoading } = useGetMyVisitedPlacesQuery({
    limit: 5000,
    country: countryFilter.country || undefined,
  }, { skip: !countryFilter.ready });
  const [toggleVisited, { isLoading: isToggling }] = useToggleVisitedMutation();

  const handleTypeChange = (value: string) => {
    setActiveType(value);
    setPage(1);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleRemove = async (item: any) => {
    const targetId = item.place?._id || item.place || item.business?._id || item.business;
    if (!targetId) return;

    try {
      await toggleVisited({
        placeId: String(targetId),
        type: item.type || "Place",
      }).unwrap();
      toast.success(t("visited.removed_success") || "Removed from visited places");
    } catch (error: any) {
      toast.error(error?.data?.message || t("visited.remove_failed") || "Failed to remove");
    }
  };

  const allVisited: any[] = visitedRes?.data || [];

  const validVisited = useMemo(() => {
    return allVisited.filter((item) => Boolean(item?.place || item?.business));
  }, [allVisited]);

  const filtered = useMemo(() => {
    return validVisited.filter((item) => {
      const entity = item.place || item.business;
      if (!entity) return false;

      const isBiz = item.type === "Business" || Boolean(item.business);
      const isPlc = item.type === "Place" || (Boolean(item.place) && !isBiz);

      if (activeType === "Place" && !isPlc) return false;
      if (activeType === "Business" && !isBiz) return false;

      const name = getLocalized(entity.name, language);
      const desc = getLocalized(entity.description, language);
      const q = search.trim().toLowerCase();

      return !q || name.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
    });
  }, [validVisited, activeType, search, language]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const isFiltering = Boolean(search.trim() || activeType !== "all");
  const displayCount = isFiltering ? filtered.length : validVisited.length;

  return (
    <section className="max-w-7xl mx-auto px-3.5 sm:px-6 py-6 sm:py-10 font-public-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <span>{t("visited.title") || t("nav.visited_places") || "Visited Places"}</span>
            <span className="text-sm sm:text-base font-semibold bg-amber-400/20 text-amber-600 dark:text-amber-400 px-2.5 sm:px-3 py-0.5 rounded-full">
              {displayCount}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
            {t("visited.subtitle") || "Places you have marked as visited on Roadtripeado"}
          </p>
        </div>

        {/* Search */}
        <div className="flex items-center border border-gray-200 dark:border-slate-800 rounded-lg px-3 py-1 bg-white dark:bg-[#131b2e] w-full sm:w-auto">
          <Search className="text-gray-400 dark:text-slate-500 w-4 h-4 mr-2 shrink-0" />
          <Input
            placeholder="Search visited places..."
            className="border-none focus-visible:ring-0 w-full sm:w-52 bg-transparent text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-xs sm:text-sm"
            value={search}
            onChange={handleSearch}
          />
        </div>
      </div>

      {/* Type Filter Tabs */}
      <div className="flex gap-2 mb-7 flex-wrap">
        <CountryFilter filter={countryFilter} onChange={() => setPage(1)} />
        {TYPE_FILTERS.map(({ label, value, icon: Icon }) => (
          <button
            key={value}
            onClick={() => handleTypeChange(value)}
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium border transition-colors cursor-pointer ${
              activeType === value
                ? "bg-yellow-400 border-yellow-400 text-black font-bold"
                : "bg-white dark:bg-[#131b2e] border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-300 hover:border-yellow-400 dark:hover:border-yellow-500"
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 sm:h-64 rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#131b2e] rounded-2xl border border-gray-100 dark:border-slate-800/80">
          <CheckCircle2 className="w-12 h-12 text-amber-400 mx-auto mb-3 opacity-60" />
          <p className="text-gray-500 dark:text-slate-400 font-medium text-lg">
            {t("visited.no_places") || "No visited places yet"}
          </p>
          <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
            {t("visited.no_places_desc") || "Tap the \"Visited\" checkmark on any location map pin to add it here."}
          </p>
          <Link
            href="/maps"
            className="inline-block mt-4 bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
          >
            {t("visited.explore_maps") || "Explore Maps"}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {paginated.map((item) => {
            const entity = item.place || item.business;
            const targetId = entity?._id;
            const typeParam = item.type === "Business" ? "business" : "place";

            const rawPhoto =
              entity?.media?.[0] ||
              entity?.media?.photos?.[0] ||
              entity?.images?.[0] ||
              entity?.coverPhoto;
            const image = getImageUrl(rawPhoto);
            const name = getLocalized(entity?.name, language);

            return (
              <div
                key={item._id}
                className="group relative bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col"
              >
                {/* Image */}
                <div className="relative h-32 sm:h-48 w-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                  {image ? (
                    <img
                      src={image}
                      alt={name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <NoImage />
                  )}

                  {/* Gold Visited Badge */}
                  <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-amber-400/90 text-black px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold flex items-center gap-1 shadow-sm backdrop-blur-xs">
                    <CheckCircle2 size={12} className="text-black shrink-0" />
                    <span>{t("visited.badge") || "Visited"}</span>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemove(item)}
                    disabled={isToggling}
                    className="absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/50 hover:bg-red-600 text-white flex items-center justify-center transition-colors cursor-pointer"
                    title={t("visited.remove_tooltip") || "Remove from visited"}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Info */}
                <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-slate-100 text-xs sm:text-base mb-0.5 sm:mb-1 truncate">
                      {name}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1 truncate mb-1.5 sm:mb-2">
                      <MapPin size={11} className="shrink-0 text-amber-500" />
                      <span>{entity?.address || entity?.map?.name || t("visited.view_on_map") || "View on map"}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 sm:pt-2 border-t border-gray-100 dark:border-slate-800/80 text-[10px] sm:text-xs">
                    <div className="flex items-center gap-1 font-bold text-gray-900 dark:text-slate-100">
                      <Star size={12} className="fill-amber-400 text-amber-400 shrink-0" />
                      <span>{entity?.rating || "—"}</span>
                    </div>

                    <Link
                      href={`/places/${targetId}?type=${typeParam}`}
                      className="font-bold text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      {t("visited.view_details") || "View Details →"}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-10">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 dark:border-slate-800 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-gray-600 dark:text-slate-300">
            {t("visited.page") || "Page"} {page} {t("visited.of") || "of"} {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-200 dark:border-slate-800 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </section>
  );
}
