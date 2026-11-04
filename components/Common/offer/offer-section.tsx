"use client";

import { Button } from "@/components/ui/button";
import Image, { StaticImageData } from "next/image";
import { useState, useEffect } from "react";

import { FavouriteButton } from "@/components/shared/favourite-button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetProfileQuery } from "@/redux/features/user/userApi";
import { useGetFavouritesQuery } from "@/redux/features/favourite/favouriteApi";
import { useGetOffersQuery } from "@/redux/features/offer/offerApi";
import { useGetMapsQuery } from "@/redux/features/map/mapApi";
import { resolveOfferMap, offerMatchesCountry } from "@/lib/offer-country";
import { getLocalized } from "@/lib/utils";
import { useAppSelector } from "@/redux/hook";
import Link from "next/link";
import { Lock, Search } from "lucide-react";
import { appAlert } from "@/lib/app-alert";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { formatOfferDiscountLabel } from "@/lib/offer-label";
import { getImageUrl } from "@/lib/utils";

export default function OfferSection() {
  const { t, language } = useLanguage();
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const { data: userProfile } = useGetProfileQuery({}, { skip: !accessToken });
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");



  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedMapId, setSelectedMapId] = useState("");
  const [selectionRestored, setSelectionRestored] = useState(false);
  const [showAllCountries, setShowAllCountries] = useState(false);
  const { data: mapsResponse, isLoading: isLoadingMaps } = useGetMapsQuery({ limit: 100 });
  const maps = mapsResponse?.data || [];
  const selectedMap = showAllCountries ? null : resolveOfferMap(maps, selectedMapId, selectedCountry);

  const getMapName = (m: any) => {
    if (!m) return "";
    return getLocalized(m.name, language) || m.country || getLocalized(m.name, "es") || getLocalized(m.name, "en") || "";
  };

  useEffect(() => {
    try {
      setSelectedCountry(localStorage.getItem("selectedCountryFilter") || "");
      setSelectedMapId(localStorage.getItem("selectedMapId") || "");
    } catch {
      // Storage may be unavailable; the first available map remains the default.
    } finally {
      setSelectionRestored(true);
    }
  }, []);

  const scopeReady = selectionRestored && !isLoadingMaps;
  const { currentData: offersRes, isFetching } = useGetOffersQuery({
    map: selectedMap?._id || selectedMap?.id || (!showAllCountries ? selectedMapId || undefined : undefined),
    country: !selectedMap && !showAllCountries ? selectedCountry || undefined : undefined,
    limit: 100,
  }, { skip: !scopeReady });
  const offersData = (offersRes?.data || []).filter((offer: any) =>
    // When metadata is absent, the server still scopes results by the saved map ID.
    (!showAllCountries && !selectedMap && Boolean(selectedMapId)) ||
    offerMatchesCountry(offer, selectedMap, showAllCountries ? "" : selectedMap ? "" : selectedCountry),
  );

  // Fetch the user's full favourites list — persists across reloads
  const { data: favouritesRes } = useGetFavouritesQuery();
  const favouritesList: any[] = favouritesRes?.data || [];

  // Only filters that are actually implemented
  const filters = [
    { id: "All", label: t("common.all") },
    { id: "Favorites", label: t("filters.favorites") },
  ];

  // Derive if an offer is favourited from the server list
  const isOfferFavourited = (offerId: string) =>
    favouritesList.some(
      (fav: any) =>
        fav.type === "Offer" &&
        (typeof fav.offer === "string" ? fav.offer : fav.offer?._id) ===
        offerId,
    );

  const filteredOffers = offersData.filter((offer: any) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      offer.title?.toLowerCase().includes(term) ||
      (typeof offer.place === "object" &&
        (offer.place?.name?.toLowerCase().includes(term) ||
          offer.place?.address?.toLowerCase().includes(term) ||
          offer.place?.country?.toLowerCase().includes(term))) ||
      (typeof offer.business === "object" &&
        (offer.business?.name?.toLowerCase().includes(term) ||
          offer.business?.location?.address?.toLowerCase().includes(term) ||
          offer.business?.location?.city?.toLowerCase().includes(term) ||
          offer.business?.location?.country?.toLowerCase().includes(term)));

    const matchesFilter =
      activeFilter === "All" ||
      (activeFilter === "Favorites" && isOfferFavourited(offer._id));

    return matchesSearch && matchesFilter;
  });

  const offerSuggestions = offersData
    .filter((offer: any) => {
      const q = searchTerm.trim().toLowerCase();
      if (q.length < 2) return false;
      const title = String(offer.title || "").toLowerCase();
      const placeName =
        typeof offer.place === "object"
          ? String(offer.place?.name || "").toLowerCase()
          : "";
      const placeAddress =
        typeof offer.place === "object"
          ? String(offer.place?.address || "").toLowerCase()
          : "";
      const businessName =
        typeof offer.business === "object"
          ? String(offer.business?.name || "").toLowerCase()
          : "";
      const businessAddress =
        typeof offer.business === "object"
          ? String(offer.business?.location?.address || "").toLowerCase()
          : "";

      return (
        title.includes(q) ||
        placeName.includes(q) ||
        placeAddress.includes(q) ||
        businessName.includes(q) ||
        businessAddress.includes(q)
      );
    })
    .slice(0, 6);

  if (!scopeReady || isFetching) {
    return (
      <section className="bg-gray-50 dark:bg-[#0b0f19] min-h-screen pt-4 pb-12 sm:pt-6 sm:pb-14 md:py-12">
        <div className="max-w-360 mx-auto px-4 md:px-6">
          <div className="flex items-center gap-2.5 mb-4 sm:mb-6 md:mb-8 overflow-x-auto pt-1 pb-2.5 -mx-4 px-4 md:mx-0 md:px-0 no-scrollbar">
            <Skeleton className="h-10 w-24 rounded-full dark:bg-slate-800 shrink-0" />
            <Skeleton className="h-10 w-24 rounded-full dark:bg-slate-800 shrink-0" />
            <Skeleton className="h-10 w-24 rounded-full dark:bg-slate-800 shrink-0" />
            <Skeleton className="h-10 w-24 rounded-full dark:bg-slate-800 shrink-0" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-[400px] w-full rounded-xl dark:bg-slate-800" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-gray-50 dark:bg-[#0b0f19] min-h-screen transition-colors">
      <div className="max-w-360 mx-auto px-4 md:px-6 pt-4 pb-12 sm:pt-6 sm:pb-14 md:py-12">
        <div className="mb-3 sm:mb-4 md:mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-slate-100 tracking-tight leading-tight">
            {t("offer.title")}
          </h1>
        </div>
        {/* Search */}
        <div className="mb-3 sm:mb-4 md:mb-6">
          <div className="relative w-full">
            <div className="flex items-center gap-3 bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 rounded-xl px-2 shadow-sm">
              <Search className="text-gray-400 dark:text-slate-400 ml-2" size={20} />

              <Input
                placeholder={t("search.search_offers")}
                className="border-none h-12 focus-visible:ring-0 shadow-none text-base dark:text-slate-100 dark:placeholder:text-slate-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              />
            </div>
            {searchFocused && searchTerm.trim().length >= 2 && (
              <div className="absolute top-full z-40 mt-2 w-full overflow-hidden rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-xl">
                {offerSuggestions.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto">
                    {offerSuggestions.map((offer: any) => {
                      const placeName =
                        typeof offer.place === "object" ? offer.place?.name : "";
                      return (
                        <button
                          key={offer._id}
                          type="button"
                          className="flex w-full flex-col items-start gap-0.5 border-b border-gray-50 dark:border-slate-800/80 px-4 py-3 text-left last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/60"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setSearchTerm(offer.title);
                            setSearchFocused(false);
                          }}
                        >
                          <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                            {offer.title}
                          </span>
                          {placeName && (
                            <span className="truncate text-xs text-gray-500 dark:text-slate-400">
                              {placeName}
                            </span>
                          )}
                        </button>
                      );
                    })}
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

        {/* Filters */}
        <div className="flex items-center gap-2.5 mb-4 sm:mb-6 md:mb-8 overflow-x-auto pt-1 pb-2.5 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap no-scrollbar">
          {/* Country Filter Selector */}
          <select
            value={showAllCountries ? "" : String(selectedMap?._id || selectedMap?.id || "")}
            onChange={(e) => {
              const map = maps.find((item: any) => String(item._id || item.id) === e.target.value);
              const mapId = map ? String(map._id || map.id) : "";
              const country = map ? getMapName(map) : "";
              setSelectedMapId(mapId);
              setSelectedCountry(country);
              setShowAllCountries(!map);
              if (map) {
                localStorage.setItem("selectedMapId", mapId);
                localStorage.setItem("selectedCountryFilter", country);
              } else {
                localStorage.removeItem("selectedMapId");
                localStorage.removeItem("selectedCountryFilter");
              }
            }}
            className="h-10 px-3 sm:px-4 max-w-[140px] sm:max-w-[200px] truncate border border-gray-200 dark:border-slate-800 rounded-full focus:outline-none focus:ring-2 focus:ring-[#fabf13] text-sm bg-white dark:bg-[#131b2e] font-semibold text-gray-700 dark:text-slate-200 cursor-pointer shadow-sm hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <option value="">
              {t("filters.all_countries") ||
                (language === "es" ? "Todos los Países" : "All Countries")}
            </option>
            {mapsResponse?.data?.map((map: any) => {
              const nameStr = getMapName(map);
              return (
                <option key={map._id} value={String(map._id || map.id)}>
                  {nameStr}
                </option>
              );
            })}
          </select>
          {filters.map((filter) => (
            <Button
              key={filter.id}
              variant={activeFilter === filter.id ? "default" : "outline"}
              className={`rounded-full transition-all shrink-0 whitespace-nowrap ${
                activeFilter === filter.id
                  ? "bg-yellow-400 text-black hover:bg-yellow-500 border-yellow-500 shadow-md font-bold"
                  : "hover:bg-gray-100 dark:bg-[#131b2e] dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Offer Grid */}
        {filteredOffers.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-[#131b2e] rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
            <p className="text-xl font-semibold text-gray-400 dark:text-slate-500">
              {t("search.no_results")}
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
              {searchTerm
                ? t("common.loading")
                : t("offer.subtitle")}
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {filteredOffers.map((offer: any, index: number) => {
            const favourited = isOfferFavourited(offer._id);

            // Handle case where offer.place is an object
            const placeId = (offer.place && typeof offer.place === 'object') ? offer.place._id : (offer.place || null);

            const purchasedMaps = Array.isArray(userProfile?.purchasedMaps) ? userProfile.purchasedMaps : [];
            const isAdminOrEditor = ["super_admin", "admin", "map_editor"].includes(userProfile?.role || "");

            const offerMapId = offer.map
              ? (typeof offer.map === 'object' ? (offer.map._id || offer.map.id) : offer.map)
              : (offer.place && typeof offer.place === 'object' && offer.place.map)
                ? (typeof offer.place.map === 'object' ? (offer.place.map._id || offer.place.map.id) : offer.place.map)
                : (offer.business && typeof offer.business === 'object' && offer.business.map)
                  ? (typeof offer.business.map === 'object' ? (offer.business.map._id || offer.business.map.id) : offer.business.map)
                  : null;

            const isPurchased = isAdminOrEditor || (offerMapId && purchasedMaps.some((m: any) => {
              const mid = typeof m === 'object' ? (m._id || m.id) : m;
              return String(mid) === String(offerMapId);
            }));

            const isStandardPlaceOffer = !offer.business && !!offer.place;
            const isOfferLocked = offer.isLocked || (isStandardPlaceOffer && !isPurchased);

            const handleOfferClick = (e: React.MouseEvent) => {
              if (isOfferLocked) {
                e.preventDefault();
                appAlert.fire({
                  title: t("offer.unlock_title"),
                  text: t("offer.unlock_text"),
                  icon: "info",
                  showCancelButton: true,
                  confirmButtonText: t("offer.unlock_confirm"),
                  cancelButtonText: t("offer.unlock_cancel"),
                }).then((result) => {
                  if (result.isConfirmed) {
                    if (offerMapId) {
                      window.location.href = `/catalog/${offerMapId}`;
                    } else {
                      window.location.href = "/catalog";
                    }
                  }
                });
              }
            };

            // Build the href: business page → place page → offer page as fallback
            const businessId = offer.business?._id || (typeof offer.business === 'string' ? offer.business : null);
            const offerPlaceId = placeId;
            const offerHref = businessId
              ? `/places/${businessId}?type=business`
              : offerPlaceId
                ? `/places/${offerPlaceId}`
                : `/offer/${offer?._id}`;

            return (
              <Link
                key={offer._id}
                href={offerHref}
                onClick={handleOfferClick}
                className="group block h-full"
              >
                <div className="h-full flex flex-col justify-between group rounded-xl overflow-hidden border border-gray-200 dark:border-slate-800/80 bg-white dark:bg-[#131b2e]/90 hover:shadow-md hover:dark:border-amber-400/40 backdrop-blur-md transition">
                  {/* Image */}
                  <div className="relative h-36 sm:h-48 md:h-72 w-full overflow-hidden bg-slate-100 dark:bg-slate-900 shrink-0">
                    <Image
                      src={getImageUrl(offer?.images || offer?.photo || offer?.photos)}
                      alt={offer.title}
                      width={500}
                      height={500}
                      priority={index < 6}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
                      className={`object-cover h-36 sm:h-48 md:h-72 w-full transition-all duration-500 ${
                        isOfferLocked
                          ? "filter blur-[16px] scale-115 select-none pointer-events-none"
                          : "hover:scale-105"
                      }`}
                    />
                    {isOfferLocked && (
                      <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                    )}

                    {/* Favorite Button */}
                    <div className="absolute right-3 top-3">
                      <FavouriteButton
                        placeId={offer._id}
                        type="Offer"
                        Style="rounded-full w-10 h-10 border-none bg-secondary hover:bg-secondary/80 p-0 shadow-sm"
                      />
                    </div>

                    {/* Lock Badge */}
                    {isOfferLocked && (
                      <div className="absolute left-3 top-3 bg-red-500 text-white px-2.5 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold shadow-lg">
                        <Lock className="w-3.5 h-3.5" />
                        {t("common.locked")}
                      </div>
                    )}

                    {/* Discount Badge */}
                    <div className="absolute bottom-3 right-3 bg-red-500 text-white text-sm px-2 py-1 rounded-md font-bold max-w-[70%] text-right leading-tight">
                      {formatOfferDiscountLabel(offer)}
                    </div>
                  </div>

                  {/* Text */}
                  <div className="p-2.5 md:p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-sm md:text-base line-clamp-2 min-h-[2.5rem] md:min-h-[2.75rem] leading-snug text-gray-900 dark:text-slate-100">
                        {offer.title}
                      </h3>
                    </div>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 truncate mt-1.5">
                      {offer.business?.name || offer.place?.name || "Multiple Locations"}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        )}
      </div>
    </section>
  );
}
