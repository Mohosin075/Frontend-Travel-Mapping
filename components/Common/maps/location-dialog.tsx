"use client";

import { FavouriteButton } from "@/components/shared/favourite-button";
import { VisitedButton } from "@/components/shared/visited-button";
import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import { NoImage } from "@/lib/others/others";
import { getUsableMediaUrl, getLocalized } from "@/lib/utils";
import { useGetSingleBusinessQuery } from "@/redux/features/business/businessApi";
import { useGetPlaceDetailsQuery } from "@/redux/features/place/placeApi";
import { normalizePinType, trackUsage } from "@/lib/record-visit";
import { useEffect, useState } from "react";
import { Star, X, Lock, Sparkles, Compass, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { toast } from "sonner";
import { addLocationToRouteDraft, isLocationInRouteDraft } from "@/lib/route-planner-utils";
import AddToRouteModal from "@/components/Common/route-planner/add-to-route-modal";

const getSafeString = (val: any, lang: string = "es"): string => {
  return getLocalized(val, lang);
};

type Props = {
  id: { id: string; type: string };
  onClose: () => void;
  mapId?: string;
  initialData?: any;
};

export default function LocationDialog({ id, onClose, mapId, initialData }: Props) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const placeId = id?.id;
  const initialType = normalizePinType(id?.type);
  const [activeType, setActiveType] = useState<"place" | "business">(
    initialType === "business" ? "business" : "place"
  );
  const [hasFalledBack, setHasFalledBack] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isInRoute, setIsInRoute] = useState(false);
  const [isAddToRouteModalOpen, setIsAddToRouteModalOpen] = useState(false);

  useEffect(() => {
    setActiveType(initialType === "business" ? "business" : "place");
    setHasFalledBack(false);
    setIsDescriptionExpanded(false);
  }, [initialType, placeId]);

  // Fetch based on activeType
  const {
    data: businessRes,
    isLoading: isBusinessLoading,
    isFetching: isBusinessFetching,
    status: businessStatus,
    isError: isBusinessError,
  } = useGetSingleBusinessQuery(placeId, {
    skip: activeType !== "business",
  });

  const {
    data: placeRes,
    isLoading: isPlaceLoading,
    isFetching: isPlaceFetching,
    status: placeStatus,
    isError: isPlaceError,
    error: placeError,
  } = useGetPlaceDetailsQuery(placeId, {
    skip: activeType !== "place",
  });

  // Automatic fallback if initial type query fails/returns empty
  useEffect(() => {
    if (hasFalledBack) return;
    if (activeType === "business" && isBusinessError && !businessRes?.data) {
      setHasFalledBack(true);
      setActiveType("place");
    } else if (
      activeType === "place" &&
      isPlaceError &&
      !placeRes?.data &&
      (placeError as any)?.status !== 403
    ) {
      setHasFalledBack(true);
      setActiveType("business");
    }
  }, [activeType, isBusinessError, isPlaceError, businessRes, placeRes, placeError, hasFalledBack]);

  const type = activeType;

  useEffect(() => {
    if (!placeId) return;
    trackUsage(type, placeId);
  }, [placeId, type]);

  const isLoading =
    type === "business"
      ? isBusinessLoading || isBusinessFetching || businessStatus === "pending" || businessStatus === "uninitialized"
      : isPlaceLoading || isPlaceFetching || placeStatus === "pending" || placeStatus === "uninitialized";

  const location: any =
    type === "business"
      ? businessRes?.data || initialData
      : placeRes?.data || initialData;

  // Place: media[]; Business: media.photos[]
  const coverSource =
    type === "business"
      ? location?.media?.photos || location?.media
      : location?.media || location?.media?.photos;
  const coverImage = getUsableMediaUrl(coverSource);
  const locationId = location?._id || location?.id || placeId;

  useEffect(() => {
    if (locationId) {
      setIsInRoute(isLocationInRouteDraft(String(locationId)));
    }

    const onDraftChange = () => {
      if (locationId) {
        setIsInRoute(isLocationInRouteDraft(String(locationId)));
      }
    };

    window.addEventListener("roadtripeado_route_draft_changed", onDraftChange);
    return () => {
      window.removeEventListener("roadtripeado_route_draft_changed", onDraftChange);
    };
  }, [locationId, location]);

  const handleAddToRoute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAddToRouteModalOpen(true);
  };

  const isLocked = (placeError as any)?.status === 403 || location?.isLocked;

  if (isLocked) {
    const message = (placeError as any)?.data?.message || t("maps.unlock_map_message", "This information and these benefits can be unlocked by purchasing your favorite map.");
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
        {/* Click outside backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 animate-in fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
        <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-2xl w-full max-w-md relative z-10 p-8 text-center space-y-6 transition-all duration-300 ease-out animate-in fade-in-0 zoom-in-95">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-full flex items-center justify-center shadow hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>

          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 dark:bg-amber-950/50 text-yellow-600 dark:text-amber-400 rounded-full">
            <Lock size={28} />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
              <Lock size={12} />
              {t("map.unlock_full_map")}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-slate-100 leading-tight">
              {t("map.premium_location", "Premium Location")}
            </h2>
            <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed px-4">
              {message}
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <Link
              href={mapId ? `/catalog/${mapId}` : "/catalog"}
              onClick={onClose}
              className="w-full"
            >
              <Button className="w-full bg-[#FFC107] hover:bg-[#FFB300] text-black font-bold rounded-xl h-12 shadow-md shadow-yellow-500/20 cursor-pointer">
                {t("map.buy_map")}
              </Button>
            </Link>
            <button
              onClick={onClose}
              className="w-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-semibold rounded-xl h-12 transition-colors cursor-pointer text-sm"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Smooth skeleton card instead of small jumpy spinner box
  if (isLoading && !location) {
    return (
      <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 pb-16 sm:pb-4">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 animate-in fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
        <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-800 rounded-t-[28px] rounded-b-[20px] sm:rounded-[32px] shadow-2xl w-full max-w-md relative z-10 flex flex-col overflow-hidden max-h-[80dvh] sm:max-h-[85vh] min-h-0 transition-all duration-300 ease-out animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-6 sm:slide-in-from-bottom-4">
          <div className="h-36 sm:h-48 shrink-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 animate-pulse" />
          <div className="p-4 sm:p-6 space-y-3">
            <div className="h-6 w-3/4 bg-gray-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-4 w-1/3 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
            <div className="space-y-2 pt-2">
              <div className="h-3.5 w-full bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-3.5 w-5/6 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
            </div>
            <div className="h-11 w-full bg-gray-200 dark:bg-slate-800 rounded-xl animate-pulse mt-4" />
          </div>
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 animate-in fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
        <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-2xl w-full max-w-md relative z-10 p-8 text-center space-y-4 transition-all duration-300 ease-out animate-in fade-in-0 zoom-in-95">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-full flex items-center justify-center shadow hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 pt-2">
            {t("search.no_results")}
          </h2>
          <Button
            onClick={onClose}
            className="w-full bg-[#FFC107] hover:bg-[#FFB300] text-black font-bold rounded-xl h-12 shadow-md shadow-yellow-500/20 cursor-pointer"
          >
            {t("common.close")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 pb-16 sm:pb-4">
      {/* Click outside backdrop */}
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px] transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="bg-white dark:bg-[#131b2e]/95 backdrop-blur-xl border border-transparent dark:border-slate-800 text-gray-900 dark:text-slate-100 rounded-t-[28px] rounded-b-[20px] sm:rounded-[32px] shadow-2xl w-full max-w-md relative z-10 flex flex-col overflow-hidden max-h-[80dvh] sm:max-h-[85vh] min-h-0 transition-all duration-300 ease-out animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-6 sm:slide-in-from-bottom-4">
        {/* Close — always tappable above image + description */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close location"
          className="absolute top-3 right-3 z-[60] w-9 h-9 sm:w-11 sm:h-11 bg-white/95 dark:bg-[#0b0f19]/90 text-gray-900 dark:text-slate-100 rounded-full flex items-center justify-center shadow-lg hover:bg-white dark:hover:bg-slate-800 border border-transparent dark:border-slate-800 transition-transform active:scale-95"
        >
          <X size={20} className="sm:hidden" />
          <X size={22} className="hidden sm:block" />
        </button>

        {/* Image stays visible; long copy only scrolls below */}
        <div className="relative h-48 sm:h-60 shrink-0 grow-0 overflow-hidden rounded-t-[28px] sm:rounded-t-[32px] bg-gray-100 dark:bg-slate-800">
          {coverImage ? (
            <SafeImage
              src={coverImage}
              alt={location?.name}
              fill
              priority={true}
              className="w-full h-full object-cover object-center"
            />
          ) : isLoading ? (
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
          ) : (
            <NoImage />
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-black mb-1.5 pr-8 leading-tight">{getSafeString(location?.name, language)}</h2>

          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100">
              <Star size={14} className="fill-black dark:fill-[#fabf13] mr-1 text-black dark:text-[#fabf13]" />
              {location?.rating ?? "—"}
            </div>

            <span className="text-gray-400 dark:text-slate-400 text-xs sm:text-sm truncate">
              ({location?.totalReview ?? 0} {t("place.reviews")}){" "}
              {getSafeString(location?.map?.name, language) || location?.location?.country || ""}
            </span>
          </div>

          {(location?.discoveredByName || location?.discoveredBy?.name) && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/25 dark:border-amber-400/20 text-xs font-semibold text-amber-900 dark:text-amber-200 w-fit mb-3">
              <Sparkles size={13} className="text-amber-500 fill-amber-500 shrink-0" />
              <span>
                {t("maps.discovered_by", language === "es" ? "Descubierto por" : "Discovered by")}{" "}
                {(() => {
                  const discovererName = location.discoveredByName || location.discoveredBy?.name;
                  const discovererId =
                    typeof location.discoveredBy === "object"
                      ? location.discoveredBy?._id || location.discoveredBy?.id
                      : location.discoveredBy;

                  if (discovererId) {
                    return (
                      <Link
                        href={`/explorer/${discovererId}`}
                        className="font-bold underline decoration-amber-500/50 hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {discovererName}
                      </Link>
                    );
                  }
                  return <span className="font-bold">{discovererName}</span>;
                })()}
              </span>
            </div>
          )}

          {location?.description ? (
            <div className="mb-4">
              <p
                className={`text-xs sm:text-sm text-gray-600 dark:text-slate-300 leading-relaxed ${
                  !isDescriptionExpanded ? "line-clamp-3" : ""
                }`}
              >
                {getSafeString(location.description, language)}
              </p>
              {location.description.length > 140 && (
                <button
                  type="button"
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className="text-xs font-semibold text-amber-600 hover:text-amber-700 mt-1 inline-flex items-center transition-colors cursor-pointer"
                >
                  {isDescriptionExpanded ? t("place.show_less") : t("place.read_more")}
                </button>
              )}
            </div>
          ) : isLoading ? (
            <div className="space-y-2 mb-4">
              <div className="h-3.5 w-full bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-3.5 w-4/5 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          ) : null}

          {type !== "business" && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3 mb-4">
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                {t("place.notice_disclaimer")}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Link href={`/places/${placeId}?type=${type}`} className="flex-1">
              <Button className="w-full bg-[#FFC107] hover:bg-[#e0ac10] text-black font-bold rounded-xl h-11 sm:h-12 text-xs sm:text-sm shadow-sm transition-all">
                {t("place.view_details")}
              </Button>
            </Link>

            {/* Add to Route Button */}
            <button
              type="button"
              onClick={handleAddToRoute}
              title={isInRoute ? t("maps.in_your_route", "In your route (View)") : t("maps.add_to_route", "Add to Route")}
              aria-label={isInRoute ? t("maps.in_your_route", "In your route (View)") : t("maps.add_to_route", "Add to Route")}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 shadow-xs ${
                isInRoute
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-100"
                  : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:border-amber-400"
              }`}
            >
              {isInRoute ? <CheckCircle2 size={19} /> : <Compass size={19} />}
            </button>

            {locationId && (
              <>
                <VisitedButton
                  placeId={locationId}
                  type={type === "business" ? "Business" : "Place"}
                  initialIsVisited={location?.isVisited}
                  Style="w-11 h-11 sm:w-12 sm:h-12"
                />
                <FavouriteButton
                  placeId={locationId}
                  type={type === "business" ? "Business" : "Place"}
                  Style="w-11 h-11 sm:w-12 sm:h-12 rounded-xl border border-gray-200 dark:border-slate-700/80 bg-gray-50 dark:bg-[#1a233a] hover:bg-gray-100 dark:hover:bg-[#232f4e]"
                />
              </>
            )}
          </div>
        </div>
      </div>

      <AddToRouteModal
        isOpen={isAddToRouteModalOpen}
        onClose={() => setIsAddToRouteModalOpen(false)}
        location={location || initialData}
        type={type}
      />
    </div>
  );
}
