"use client";

import { Input } from "@/components/ui/input";
import { NoImage } from "@/lib/others/others";
import { getImageUrl, getLocalized } from "@/lib/utils";
import {
  useAddToFavouriteMutation,
  useRemoveFavouriteMutation,
  useGetFavouritesQuery,
} from "@/redux/features/favourite/favouriteApi";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useLanguage } from "@/lib/i18n/LanguageContext";

import { CountryFilter, useCountryFilter } from "@/components/shared/country-filter";

const PAGE_SIZE = 9;

export default function FavoritePlaces() {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState("all");
  const [page, setPage] = useState(1);

  const countryFilter = useCountryFilter({ allowAll: false });

  // Removed "Map" filter button as requested
  const TYPE_FILTERS = [
    { label: t("common.all"), value: "all" },
    { label: t("nav.places"), value: "Place", icon: MapPin },
    { label: t("dashboard.sidebar.business"), value: "Business", icon: Building2 },
  ];

  const { currentData: favouritesRes, isFetching, isError, refetch } = useGetFavouritesQuery(
    { country: countryFilter.country || undefined },
    { skip: !countryFilter.ready || !countryFilter.country },
  );
  const isLoading = !countryFilter.ready || isFetching;
  const [addToFavourite] = useAddToFavouriteMutation();
  const [removeFavourite, { isLoading: isRemoving }] = useRemoveFavouriteMutation();

  const handleTypeChange = (value: string) => {
    setActiveType(value);
    setPage(1);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  // Helper to identify business entities
  const isBusinessItem = (fav: any) => {
    return (
      fav.type === "Business" ||
      Boolean(fav.business) ||
      fav.place?.type === "Business" ||
      fav.place?.placeType === "Business"
    );
  };

  // Helper to identify place entities
  const isPlaceItem = (fav: any) => {
    return Boolean(fav.place) && !isBusinessItem(fav);
  };

  // Remove from favourite by id directly or fallback to toggle
  const handleRemove = async (fav: any) => {
    try {
      if (fav._id) {
        await removeFavourite(fav._id).unwrap();
      } else {
        const key = fav.business
          ? "business"
          : fav.map
            ? "map"
            : fav.offer
              ? "offer"
              : "place";
        const refId = typeof fav[key] === "string" ? fav[key] : fav[key]?._id;
        if (!refId) return;
        await addToFavourite({ type: fav.type || "Place", [key]: refId }).unwrap();
      }
      toast.success(t("places.removed_from_favorites") || "Removed from favorites");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to remove");
    }
  };

  const allFavourites: any[] = favouritesRes?.data || [];

  // Filter by type and search
  const filtered = useMemo(() => {
    return allFavourites.filter((fav) => {
      // Must have valid entity data
      if (!fav.place && !fav.business && !fav.map && !fav.offer) {
        return false;
      }

      const isBiz = isBusinessItem(fav);
      const isPlc = isPlaceItem(fav);

      if (activeType === "Place") {
        if (!isPlc) return false;
      } else if (activeType === "Business") {
        if (!isBiz) return false;
      } else if (activeType === "all") {
        // "all" includes places and businesses (and maps/offers if any)
      }

      const name = getLocalized(
        fav.place?.name ||
          fav.business?.name ||
          fav.map?.name ||
          fav.offer?.title ||
          fav.offer?.name ||
          fav.name,
        language
      );

      const description = getLocalized(
        fav.place?.description ||
          fav.business?.description ||
          fav.map?.description ||
          fav.offer?.description ||
          fav.description,
        language
      );

      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        name.toLowerCase().includes(q) ||
        description.toLowerCase().includes(q);

      return matchesSearch;
    });
  }, [allFavourites, activeType, search, language]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <section className="max-w-7xl mx-auto px-6 py-10 font-public-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">
          {t("nav.favorite_places")}
        </h1>

        {/* Search */}
        <div className="flex items-center border border-gray-200 dark:border-slate-800 rounded-lg px-3 py-1 bg-white dark:bg-[#131b2e]">
          <Search className="text-gray-400 dark:text-slate-500 w-4 h-4 mr-2" />
          <Input
            placeholder={t("filters.favorites") || "Search favorites..."}
            className="border-none focus-visible:ring-0 w-52 bg-transparent text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
            value={search}
            onChange={handleSearch}
          />
        </div>
      </div>

      <div className="mb-4"><CountryFilter filter={countryFilter} onChange={() => setPage(1)} /></div>

      {/* Type Filter Tabs */}
      <div className="flex gap-2 mb-7 flex-wrap">
        {TYPE_FILTERS.map(({ label, value, icon: Icon }) => (
          <button
            key={value}
            onClick={() => handleTypeChange(value)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
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

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {t("common.loading")}
          </p>
        </div>
      )}

      {isError && <div role="alert" className="py-8 text-center text-sm">
        <p>{language === 'es' ? 'No se pudieron cargar los favoritos.' : 'Unable to load favorites.'}</p>
        <button type="button" className="mt-2 underline" onClick={() => refetch()}>{language === 'es' ? 'Reintentar' : 'Retry'}</button>
      </div>}

      {/* Empty state */}
      {!isLoading && !isError && paginated.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-slate-500 text-sm">
          {search
            ? t("common.no_results") || "No results found."
            : t("places.no_favorites") || "You have no favorites yet."}
        </div>
      )}

      {/* Grid */}
      <div className="grid md:grid-cols-3 gap-6 mt-6">
        {paginated.map((fav: any) => {
          const isBiz = isBusinessItem(fav);
          const isPlc = isPlaceItem(fav);

          // Resolve localized name and description safely
          const name =
            getLocalized(
              fav.place?.name ||
                fav.business?.name ||
                fav.map?.name ||
                fav.offer?.title ||
                fav.offer?.name ||
                fav.name,
              language
            ) || "Untitled";

          const description =
            getLocalized(
              fav.place?.description ||
                fav.business?.description ||
                fav.map?.description ||
                fav.offer?.description ||
                fav.description,
              language
            ) || "";

          // Resolve image — place: media[], business: media.photos[], map: images[]
          const rawImage =
            fav.place?.media?.[0] ||
            fav.business?.media?.photos?.[0] ||
            fav.business?.media?.[0] ||
            fav.map?.images?.[0] ||
            fav.offer?.image ||
            fav.offer?.media?.[0];

          const imageSrc = rawImage ? getImageUrl(rawImage) : null;

          const targetPlaceId =
            fav.business?._id ||
            fav.place?._id ||
            (typeof fav.business === "string" ? fav.business : null) ||
            (typeof fav.place === "string" ? fav.place : null);

          const href = isBiz
            ? `/places/${targetPlaceId}?type=business`
            : isPlc
              ? `/places/${targetPlaceId}?type=place`
              : fav.map
                ? `/catalog/${fav.map?._id || fav.map}`
                : fav.href || "#";

          return (
            <div
              key={fav._id}
              className="bg-white dark:bg-[#131b2e] rounded-xl overflow-hidden border border-gray-200/80 dark:border-slate-800 hover:shadow-md transition flex flex-col"
            >
              <Link href={href} className="block shrink-0">
                <div className="w-full h-48 overflow-hidden bg-gray-100 dark:bg-slate-900 relative">
                  {imageSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageSrc}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <NoImage />
                  )}

                  {/* Badge indicating Place or Business */}
                  <span
                    className={`absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full z-10 flex items-center gap-1.5 backdrop-blur-md shadow-sm ${
                      isBiz
                        ? "bg-purple-600/90 text-white"
                        : isPlc
                          ? "bg-amber-500/90 text-black font-extrabold"
                          : "bg-blue-600/90 text-white"
                    }`}
                  >
                    {isBiz ? (
                      <Building2 className="w-3 h-3" />
                    ) : isPlc ? (
                      <MapPin className="w-3 h-3" />
                    ) : null}
                    {isBiz
                      ? t("dashboard.sidebar.business") || "Business"
                      : isPlc
                        ? t("nav.places") || "Place"
                        : t("nav.map") || "Map"}
                  </span>
                </div>
              </Link>

              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-semibold text-lg line-clamp-1 text-gray-900 dark:text-slate-100">
                  {name}
                </h3>
                <p className="text-gray-500 dark:text-slate-400 text-sm mt-1 line-clamp-2 flex-1">
                  {description}
                </p>

                <button
                  onClick={() => handleRemove(fav)}
                  disabled={isRemoving}
                  className="text-xs tracking-widest text-gray-400 dark:text-slate-500 mt-3 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50 text-left font-bold"
                >
                  REMOVE
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <button
            onClick={() => setPage(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            className="p-2 rounded-lg border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium border transition-colors ${
                safePage === p
                  ? "bg-yellow-400 border-yellow-400 text-black font-bold"
                  : "bg-white dark:bg-[#131b2e] border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-300 hover:border-yellow-400 dark:hover:border-yellow-500"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => setPage(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages}
            className="p-2 rounded-lg border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </section>
  );
}
