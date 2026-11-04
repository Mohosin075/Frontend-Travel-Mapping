"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatEntryCost, formatHikeTime, getImageUrl, getProfileImageUrl, getLocalized, convertTo12Hour, formatLocalizedSchedule, cleanDescriptionHtml } from "@/lib/utils";
import {
  useGetPlaceDetailsQuery,
  useReviewRecommendedPlaceMutation,
} from "@/redux/features/place/placeApi";
import { useGetReviewsByPlaceQuery } from "@/redux/features/review/reviewApi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { MenuLightbox } from "@/components/Common/maps/MenuLightbox";
import { toast } from "sonner";
import { appAlert } from "@/lib/app-alert";
import {
  Accessibility,
  Baby,
  Calendar,
  Car,
  Check,
  Clock,
  Coins,
  Compass,
  Dog,
  ExternalLink,
  Gauge,
  Globe,
  Heart,
  Info,
  Instagram,
  Lightbulb,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  Sparkles,
  Star,
  ToolCase,
  Users,
  Utensils,
  Wifi,
  X,
} from "lucide-react";

interface ViewPlaceModalProps {
  placeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewPlaceModal({
  placeId,
  open,
  onOpenChange,
}: ViewPlaceModalProps) {
  const { t, language } = useLanguage();
  const { data: response, isLoading } = useGetPlaceDetailsQuery(
    placeId as string,
    {
      skip: !placeId,
    }
  );
  const { data: reviews, isLoading: isReviewsLoading } =
    useGetReviewsByPlaceQuery(placeId as string, {
      skip: !placeId,
    });

  const [reviewRecommendedPlace, { isLoading: isReviewing }] =
    useReviewRecommendedPlaceMutation();

  const [activeTab, setActiveTab] = useState("overview");
  const [imageErrorIndex, setImageErrorIndex] = useState<Record<number, boolean>>({});
  const [menuLightboxOpen, setMenuLightboxOpen] = useState(false);
  const [selectedMenuIndex, setSelectedMenuIndex] = useState(0);

  const place = response?.data;

  const handleApprove = async () => {
    if (!place) return;
    const contributor =
      place.discoveredByName || place.discoveredBy?.name || "el usuario";
    appAlert
      .fire({
        title:
          language === "es"
            ? "¿Aprobar lugar recomendado?"
            : "Approve recommended spot?",
        text:
          language === "es"
            ? `¿Deseas aprobar "${getLocalized(
                place.name,
                language
              )}" y otorgar 25 puntos a ${contributor}?`
            : `Do you want to approve "${getLocalized(
                place.name,
                language
              )}" and award 25 points to ${contributor}?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText:
          language === "es" ? "Sí, aprobar (+25 pts)" : "Yes, approve (+25 pts)",
        cancelButtonText: language === "es" ? "Cancelar" : "Cancel",
        confirmButtonColor: "#10B981",
      })
      .then(async (result) => {
        if (result.isConfirmed) {
          try {
            await reviewRecommendedPlace({
              id: place._id,
              data: { status: "Published", pointsAwarded: 25 },
            }).unwrap();
            toast.success(
              language === "es"
                ? "Lugar aprobado y 25 puntos otorgados al descubridor."
                : "Spot approved, published, and 25 points awarded!"
            );
          } catch (error: any) {
            toast.error(error?.data?.message || "Failed to approve place");
          }
        }
      });
  };

  const handleReject = async () => {
    if (!place) return;
    appAlert
      .fire({
        title:
          language === "es"
            ? "¿Rechazar lugar recomendado?"
            : "Reject recommended spot?",
        text:
          language === "es"
            ? "¿Estás seguro de que deseas rechazar este lugar?"
            : "Are you sure you want to reject this recommended place?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: language === "es" ? "Rechazar" : "Reject",
        cancelButtonText: language === "es" ? "Cancelar" : "Cancel",
        confirmButtonColor: "#EF4444",
      })
      .then(async (result) => {
        if (result.isConfirmed) {
          try {
            await reviewRecommendedPlace({
              id: place._id,
              data: { status: "Rejected" },
            }).unwrap();
            toast.success(
              language === "es"
                ? "Lugar rechazado exitosamente."
                : "Spot rejected successfully."
            );
          } catch (error: any) {
            toast.error(error?.data?.message || "Failed to reject place");
          }
        }
      });
  };

  const categoryName = getLocalized(
    typeof place?.category === "object" && place?.category?.name
      ? place.category.name
      : place?.category,
    language
  );

  const hasContent = useCallback(
    (val: any): boolean => {
      if (val == null) return false;
      const loc = getLocalized(val, language);
      if (!loc) return false;
      const trimmed = String(loc).trim();
      return (
        trimmed.length > 0 &&
        trimmed !== "0" &&
        trimmed !== "N/A" &&
        trimmed !== "n/a" &&
        trimmed !== "undefined" &&
        trimmed !== "null"
      );
    },
    [language]
  );

  const isBusinessOrRestaurant =
    place?.type === "Business" ||
    categoryName.toLowerCase().includes("restaurant") ||
    categoryName.toLowerCase().includes("cafe") ||
    categoryName.toLowerCase().includes("bar");

  const hasMenu = isBusinessOrRestaurant && place?.menuImages && place.menuImages.length > 0;
  const hasAccessibility =
    (place?.accessibility?.features && place.accessibility.features.length > 0) ||
    hasContent(place?.accessibility?.notes);
  const hasServices = place?.services && place.services.length > 0;

  const dynamicTabs = [
    { id: "overview", label: t("place.overview") || "Overview", icon: <Info size={15} /> },
    ...(hasMenu
      ? [{ id: "menu", label: t("place.menu_and_prices") || "Menu & Prices", icon: <Utensils size={15} /> }]
      : []),
    ...(hasAccessibility
      ? [
          {
            id: "accessibility",
            label: t("place.accessibility_features") || "Accessibility",
            icon: <Accessibility size={15} />,
          },
        ]
      : []),
    ...(hasServices
      ? [{ id: "services", label: t("place.services_available") || "Services", icon: <ToolCase size={15} /> }]
      : []),
    { id: "reviews", label: t("place.reviews") || "Reviews", icon: <MessageSquare size={15} /> },
  ];

  useEffect(() => {
    if (place) {
      if (activeTab === "menu" && !hasMenu) setActiveTab("overview");
      if (activeTab === "accessibility" && !hasAccessibility) setActiveTab("overview");
      if (activeTab === "services" && !hasServices) setActiveTab("overview");
    }
  }, [place, hasMenu, hasAccessibility, hasServices, activeTab]);

  const servicesIcons: Record<string, React.ReactNode> = {
    Parking: <Car size={16} />,
    Estacionamiento: <Car size={16} />,
    Restrooms: <Users size={16} />,
    "Baños": <Users size={16} />,
    "Banos": <Users size={16} />,
    "Food Nearby": <Utensils size={16} />,
    "Comida cercana": <Utensils size={16} />,
    "Comida cerca": <Utensils size={16} />,
    "Guided Tour": <MapPin size={16} />,
    "Visitas guiadas": <MapPin size={16} />,
    "Tour guiado": <MapPin size={16} />,
    "Family Friendly": <Baby size={16} />,
    Familiar: <Baby size={16} />,
    Wifi: <Wifi size={16} />,
    "Pet Friendly": <Dog size={16} />,
    "Se admiten mascotas": <Dog size={16} />,
  };

  const serviceKeyMap: Record<string, string> = {
    Parking: "parking",
    Estacionamiento: "parking",
    Restrooms: "restrooms",
    "Baños": "restrooms",
    "Banos": "restrooms",
    "Food Nearby": "food_nearby",
    "Comida cercana": "food_nearby",
    "Comida cerca": "food_nearby",
    "Guided Tour": "guided_tour",
    "Visitas guiadas": "guided_tour",
    "Tour guiado": "guided_tour",
    "Family Friendly": "family_friendly",
    Familiar: "family_friendly",
    Wifi: "wifi",
    "Pet Friendly": "pet_friendly",
    "Se admiten mascotas": "pet_friendly",
  };

  const getServiceIcon = (service: string) => {
    if (servicesIcons[service]) return servicesIcons[service];
    const match = Object.keys(servicesIcons).find(
      (k) => k.toLowerCase() === service.toLowerCase().trim()
    );
    return (match && servicesIcons[match]) || <Info size={16} />;
  };

  const getServiceLabel = (service: string) => {
    const key =
      serviceKeyMap[service] ||
      Object.entries(serviceKeyMap).find(
        ([k]) => k.toLowerCase() === service.toLowerCase().trim()
      )?.[1];
    return key ? (t(`services.${key}`) || service) : service;
  };

  const getDifficultyLabel = (diff?: string) => {
    if (!diff) return "";
    const lower = diff.toLowerCase().trim();
    if (lower === "easy" || lower === "fácil" || lower === "facil") return t("place.easy") || "Easy";
    if (lower === "medium" || lower === "moderate" || lower === "moderado") return t("place.medium") || "Moderate";
    if (lower === "hard" || lower === "difícil" || lower === "dificil") return t("place.hard") || "Hard";
    return diff;
  };

  const hasRating = Boolean(place?.rating && Number(place.rating) > 0);
  const ratingValue = hasRating ? Number(place.rating).toFixed(1) : null;
  const reviewCount = place?.totalReview ? Number(place.totalReview) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-3xl lg:max-w-4xl max-h-[90vh] sm:h-[85vh] flex flex-col gap-0 p-0 overflow-hidden border border-gray-100 dark:border-slate-800 shadow-2xl rounded-3xl bg-white dark:bg-[#131b2e] text-gray-900 dark:text-slate-100"
      >
        {isLoading ? (
          <div className="p-12 space-y-4 flex-1 flex flex-col justify-center items-center bg-gray-50/50 dark:bg-[#0b0f19]">
            <div className="w-10 h-10 rounded-full border-3 border-[#fabf13] border-t-transparent animate-spin" />
            <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">{t("place.loading_details")}</p>
          </div>
        ) : place ? (
          <>
            {/* Hero Image Header */}
            <div className="relative h-60 sm:h-72 w-full overflow-hidden shrink-0 bg-neutral-900">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/60 hover:bg-black/85 text-white transition-all backdrop-blur-md shadow-md cursor-pointer"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>

              {/* Media Carousel */}
              <Carousel className="absolute inset-0 w-full h-full">
                <CarouselContent className="h-full ml-0">
                  {place?.media && place.media.length > 0 ? (
                    place.media.map((mediaUrl: string, index: number) => {
                      const isFailed = imageErrorIndex[index];
                      const fullUrl = getImageUrl(mediaUrl);

                      return (
                        <CarouselItem key={index} className="pl-0 h-full">
                          <div className="relative w-full h-full bg-neutral-900 flex items-center justify-center">
                            {!isFailed && fullUrl ? (
                              <img
                                src={fullUrl}
                                alt={place.name || "Place image"}
                                onError={() =>
                                  setImageErrorIndex((prev) => ({ ...prev, [index]: true }))
                                }
                                className="w-full h-full object-cover brightness-90"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-tr from-neutral-800 via-neutral-900 to-neutral-800 flex flex-col items-center justify-center text-yellow-400 gap-2">
                                <Compass size={40} className="text-[#fabf13] opacity-80" />
                                <span className="text-xs text-gray-400 font-medium tracking-wide">
                                  {place.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </CarouselItem>
                      );
                    })
                  ) : (
                    <CarouselItem className="pl-0 h-full">
                      <div className="w-full h-full bg-gradient-to-tr from-neutral-800 via-neutral-900 to-neutral-800 flex flex-col items-center justify-center text-yellow-400 gap-2">
                        <Compass size={40} className="text-[#fabf13] opacity-80" />
                        <span className="text-xs text-gray-400 font-medium tracking-wide">
                          {place.name}
                        </span>
                      </div>
                    </CarouselItem>
                  )}
                </CarouselContent>

                {place?.media && place.media.length > 1 && (
                  <>
                    <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/70 text-white border-none size-8 backdrop-blur-xs transition-all" />
                    <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/70 text-white border-none size-8 backdrop-blur-xs transition-all" />
                  </>
                )}
              </Carousel>

              {/* Gradient Bottom Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none" />

              {/* Hero Information */}
              <div className="absolute bottom-0 left-0 w-full p-5 sm:p-6 z-20 flex flex-col justify-end space-y-2">
                {/* Badges Row */}
                <div className="flex flex-wrap items-center gap-2">
                  {categoryName && (
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#fabf13] text-black shadow-xs">
                      {categoryName}
                    </span>
                  )}

                  {place.type === "Business" && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500 text-white shadow-xs">
                      Business
                    </span>
                  )}

                  {hasRating && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-md border border-white/20">
                      <Star size={12} className="fill-yellow-400 text-yellow-400" />
                      <span>{ratingValue}</span>
                      {reviewCount > 0 && (
                        <span className="text-white/75 font-normal text-[11px]">
                          ({reviewCount})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Place Name */}
                <DialogTitle className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                  {getLocalized(place.name, language)}
                </DialogTitle>

                {/* Contributor / Discovered by */}
                {(place.discoveredByName || place.discoveredBy) && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fabf13]/20 text-yellow-300 border border-yellow-400/30 backdrop-blur-md w-fit">
                    <Sparkles size={11} className="text-yellow-400" />
                    <span>
                      {language === "es" ? "Descubierto por:" : "Discovered by:"}{" "}
                      {(() => {
                        const discovererName =
                          place.discoveredByName ||
                          (typeof place.discoveredBy === "object"
                            ? place.discoveredBy?.name
                            : place.discoveredBy);
                        const discovererId =
                          typeof place.discoveredBy === "object"
                            ? place.discoveredBy?._id || place.discoveredBy?.id
                            : place.discoveredBy;

                        if (discovererId) {
                          return (
                            <Link
                              href={`/explorer/${discovererId}`}
                              target="_blank"
                              className="font-bold underline decoration-yellow-400/50 hover:text-white transition-colors"
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

                {/* Location Address */}
                {place.address && (
                  <div className="flex items-center gap-1.5 text-white/85 text-xs sm:text-sm font-medium">
                    <MapPin size={14} className="text-[#fabf13] shrink-0" />
                    <span className="truncate max-w-xl">{place.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pending Approval Banner */}
            {place.status === "Pending" && (
              <div className="bg-gradient-to-r from-yellow-500/15 via-yellow-500/10 to-yellow-500/5 border-b border-yellow-500/30 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#fabf13]/20 text-yellow-600 dark:text-yellow-400 flex items-center justify-center shrink-0">
                    <Clock size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-yellow-900 dark:text-yellow-200 uppercase tracking-wide">
                      {language === "es"
                        ? "Lugar recomendado pendiente de aprobación"
                        : "Tourist Spot Awaiting Approval"}
                    </div>
                    <div className="text-xs text-yellow-700 dark:text-yellow-300">
                      {language === "es" ? "Recomendado por:" : "Recommended by:"}{" "}
                      {(() => {
                        const discovererName =
                          place.discoveredByName ||
                          (typeof place.discoveredBy === "object"
                            ? place.discoveredBy?.name
                            : place.discoveredBy) ||
                          "Usuario";
                        const discovererId =
                          typeof place.discoveredBy === "object"
                            ? place.discoveredBy?._id || place.discoveredBy?.id
                            : place.discoveredBy;

                        if (discovererId) {
                          return (
                            <Link
                              href={`/explorer/${discovererId}`}
                              target="_blank"
                              className="font-semibold text-gray-900 dark:text-white underline hover:text-yellow-600 transition-colors"
                            >
                              {discovererName}
                            </Link>
                          );
                        }
                        return <span className="font-semibold text-gray-900 dark:text-white">{discovererName}</span>;
                      })()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    disabled={isReviewing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 h-8 text-xs shadow-sm cursor-pointer"
                  >
                    <Check size={14} />
                    {language === "es" ? "Aprobar (+25 pts)" : "Approve (+25 pts)"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReject}
                    disabled={isReviewing}
                    className="border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold gap-1.5 h-8 text-xs cursor-pointer"
                  >
                    <X size={14} />
                    {language === "es" ? "Rechazar" : "Reject"}
                  </Button>
                </div>
              </div>
            )}

            {/* Rejection Feedback Banner */}
            {place.status === "Rejected" && place.adminFeedback && (
              <div className="bg-rose-50 dark:bg-rose-950/30 border-b border-rose-200 dark:border-rose-800/40 px-6 py-3 flex items-center gap-2.5 shrink-0">
                <X size={16} className="text-rose-500 shrink-0" />
                <div className="text-xs text-rose-700 dark:text-rose-300">
                  <span className="font-bold">
                    {language === "es" ? "Motivo de rechazo: " : "Rejection Reason: "}
                  </span>
                  {place.adminFeedback}
                </div>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-[#131b2e] sticky top-0 z-10 overflow-x-auto no-scrollbar shrink-0 px-4 sm:px-6">
              <div className="flex w-full gap-2">
                {dynamicTabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 py-3.5 px-3 text-xs font-bold uppercase tracking-wider transition-all relative cursor-pointer outline-none whitespace-nowrap ${
                        isActive
                          ? "text-black dark:text-slate-100 font-extrabold"
                          : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <span className={isActive ? "text-[#fabf13] dark:text-[#fabf13]" : "text-gray-400 dark:text-slate-500"}>
                        {tab.icon}
                      </span>
                      <span>{tab.label}</span>
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#fabf13] rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 bg-neutral-50/60 dark:bg-[#0b0f19]">
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* 1. OVERVIEW TAB */}
                {activeTab === "overview" && (
                  <div className="space-y-4">
                    {/* About This Place */}
                    {hasContent(place.description) && (
                      <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-2xs space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-yellow-800 dark:text-yellow-400">
                          <Info size={14} className="text-yellow-600 dark:text-yellow-400" />
                          <span>{t("place.about_this_place")}</span>
                        </div>
                        <p className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed font-normal whitespace-pre-wrap break-words">
                          {cleanDescriptionHtml(getLocalized(place.description, language))}
                        </p>
                      </div>
                    )}

                    {/* Access & Directions */}
                    {hasContent(place.access) && (
                      <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-2xs space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-yellow-800 dark:text-yellow-400">
                          <Compass size={14} className="text-yellow-600 dark:text-yellow-400" />
                          <span>{t("place.access_and_getting_here")}</span>
                        </div>
                        <p className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed font-normal whitespace-pre-wrap break-words">
                          {cleanDescriptionHtml(getLocalized(place.access, language))}
                        </p>
                      </div>
                    )}

                    {/* Tips & Recommendations */}
                    {hasContent(place.recommendations?.tips) && (
                      <div className="bg-white dark:bg-[#131b2e] border border-yellow-100 dark:border-yellow-800/40 bg-yellow-50/30 dark:bg-yellow-950/20 p-5 rounded-2xl shadow-2xs space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-yellow-800 dark:text-yellow-400">
                          <Lightbulb size={14} className="text-yellow-600 dark:text-yellow-400" />
                          <span>{t("place.tips")}</span>
                        </div>
                        <p className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed font-normal">
                          {getLocalized(place.recommendations.tips, language)}
                        </p>
                      </div>
                    )}

                    {/* Operating Hours or Schedules */}
                    {place.type === "Business" && place.operatingHours ? (
                      <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-2xs space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-yellow-800 dark:text-yellow-400">
                          <Clock size={14} className="text-yellow-600 dark:text-yellow-400" />
                          <span>{t("place.business_hours")}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-900/60 border border-gray-100 dark:border-slate-800">
                            <span className="text-gray-500 dark:text-slate-400 font-medium">{t("place.daily_hours")}</span>
                            <span className="font-bold text-gray-900 dark:text-slate-100">
                              {convertTo12Hour(place.operatingHours.openTime)} - {convertTo12Hour(place.operatingHours.closeTime)}
                            </span>
                          </div>
                          {place.operatingHours.offDays && place.operatingHours.offDays.length > 0 && (
                            <div className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 dark:bg-rose-950/30 border border-red-100 dark:border-rose-800/40">
                              <span className="text-red-700 dark:text-rose-300 font-medium">{t("place.closed_days")}</span>
                              <span className="font-bold text-red-800 dark:text-rose-200">
                                {place.operatingHours.offDays.join(", ")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      hasContent(place.schedules) && (
                        <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-2xs space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-yellow-800 dark:text-yellow-400">
                            <Clock size={14} className="text-yellow-600 dark:text-yellow-400" />
                            <span>{t("place.schedules")}</span>
                          </div>
                          <p className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed font-normal">
                            {formatLocalizedSchedule(place.schedules, language)}
                          </p>
                        </div>
                      )
                    )}

                    {/* Interactive Location Verification Card */}
                    {(place?.location?.coordinates || place?.address) && (
                      <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-2xs space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-yellow-800 dark:text-yellow-400">
                            <MapPin size={15} className="text-yellow-600 dark:text-yellow-400" />
                            <span>
                              {language === "es"
                                ? "Ubicación Geográfica y Mapa"
                                : "Location & Map Verification"}
                            </span>
                          </div>

                          {place?.location?.coordinates?.[1] !== undefined &&
                            place?.location?.coordinates?.[0] !== undefined && (
                              <a
                                href={`https://www.google.com/maps?q=${place.location.coordinates[1]},${place.location.coordinates[0]}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold transition-colors"
                              >
                                <ExternalLink size={13} />
                                <span>
                                  {language === "es"
                                    ? "Abrir en Google Maps"
                                    : "Open in Google Maps"}
                                </span>
                              </a>
                            )}
                        </div>

                        {place.address && (
                          <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-900/60 border border-gray-100 dark:border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="font-semibold text-gray-500 dark:text-slate-400">
                                {language === "es" ? "Dirección:" : "Address:"}{" "}
                              </span>
                              <span className="text-gray-900 dark:text-slate-100 font-bold">
                                {place.address}
                              </span>
                            </div>
                            {place?.location?.coordinates && (
                              <span className="text-xs font-mono font-bold text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-gray-200 dark:border-slate-700">
                                Lat: {place.location.coordinates[1]} | Lng: {place.location.coordinates[0]}
                              </span>
                            )}
                          </div>
                        )}

                        {place?.location?.coordinates?.[1] !== undefined &&
                          place?.location?.coordinates?.[0] !== undefined && (
                            <div className="h-56 sm:h-64 w-full rounded-xl overflow-hidden border border-gray-200 dark:border-slate-800 shadow-inner">
                              <iframe
                                title="Google Map Location Embed"
                                src={`https://maps.google.com/maps?q=${place.location.coordinates[1]},${place.location.coordinates[0]}&z=15&output=embed`}
                                className="w-full h-full border-0"
                                loading="lazy"
                              />
                            </div>
                          )}
                      </div>
                    )}

                    {/* Key Specifications Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {/* Coordinates */}
                      <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-800 p-4 rounded-2xl shadow-2xs space-y-1">
                        <div className="flex items-center gap-1.5 text-gray-400 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                          <MapPin size={13} className="text-yellow-600 dark:text-yellow-400" />
                          <span>{t("place.coordinates")}</span>
                        </div>
                        <p className="text-xs font-mono font-bold text-gray-800 dark:text-slate-200 truncate">
                          {place?.location?.coordinates?.[1] !== undefined
                            ? place.location.coordinates[1].toFixed(4)
                            : "N/A"}
                          ,{" "}
                          {place?.location?.coordinates?.[0] !== undefined
                            ? place.location.coordinates[0].toFixed(4)
                            : "N/A"}
                        </p>
                      </div>

                      {/* Connected Map */}
                      <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-800 p-4 rounded-2xl shadow-2xs space-y-1">
                        <div className="flex items-center gap-1.5 text-gray-400 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                          <Navigation size={13} className="text-blue-600 dark:text-blue-400" />
                          <span>{t("place.connected_map")}</span>
                        </div>
                        <p className="text-xs font-bold text-gray-900 dark:text-slate-100 truncate">
                          {getLocalized(typeof place.map === "object" ? place.map.name : place.map, language) || (t("place.general_map") || "General Map")}
                        </p>
                      </div>

                      {/* Difficulty */}
                      {hasContent(place.difficulty) && (
                        <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-800 p-4 rounded-2xl shadow-2xs space-y-1">
                          <div className="flex items-center gap-1.5 text-gray-400 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                            <Gauge size={13} className="text-emerald-600 dark:text-emerald-400" />
                            <span>{t("place.difficulty")}</span>
                          </div>
                          <span
                            className={`inline-block text-[11px] font-bold uppercase px-2 py-0.5 rounded-md ${
                              ["easy", "fácil", "facil"].includes(place.difficulty.toLowerCase().trim())
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                                : ["medium", "moderate", "moderado"].includes(place.difficulty.toLowerCase().trim())
                                ? "bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 border border-yellow-200/60 dark:border-yellow-800/60"
                                : "bg-red-50 dark:bg-rose-950/40 text-red-700 dark:text-rose-300 border border-red-200/60 dark:border-rose-800/60"
                            }`}
                          >
                            {getDifficultyLabel(place.difficulty)}
                          </span>
                        </div>
                      )}

                      {/* Walking / Hike Time */}
                      {hasContent(place.hikeTime) && (
                        <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-800 p-4 rounded-2xl shadow-2xs space-y-1">
                          <div className="flex items-center gap-1.5 text-gray-400 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                            <Clock size={13} className="text-indigo-600 dark:text-indigo-400" />
                            <span>{t("place.walking_time")}</span>
                          </div>
                          <p className="text-xs font-bold text-gray-800 dark:text-slate-200">
                            {formatHikeTime(place.hikeTime)}
                          </p>
                        </div>
                      )}

                      {/* Entry Cost */}
                      {hasContent(place.entryCost) && (
                        <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-800 p-4 rounded-2xl shadow-2xs space-y-1">
                          <div className="flex items-center gap-1.5 text-gray-400 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                            <Coins size={13} className="text-yellow-600 dark:text-yellow-400" />
                            <span>{t("place.entry_cost")}</span>
                          </div>
                          <p className="text-xs font-bold text-gray-800 dark:text-slate-200">
                            {formatEntryCost(place.entryCost, language)}
                          </p>
                        </div>
                      )}

                      {/* Atmosphere */}
                      {hasContent(place.atmosphere) && (
                        <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-800 p-4 rounded-2xl shadow-2xs space-y-1">
                          <div className="flex items-center gap-1.5 text-gray-400 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                            <Sparkles size={13} className="text-rose-500 dark:text-rose-400" />
                            <span>{t("place.atmosphere")}</span>
                          </div>
                          <p className="text-xs font-bold text-gray-800 dark:text-slate-200 truncate">
                            {getLocalized(place.atmosphere, language)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Contact & External Links */}
                    {(hasContent(place.phone) || hasContent(place.website) || hasContent(place.instagram)) && (
                      <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-2xs space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-yellow-800 dark:text-yellow-400">
                          {t("place.contact_and_links")}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs">
                          {hasContent(place.phone) && (
                            <a
                              href={`tel:${place.phone}`}
                              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-slate-900/80 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-800 dark:text-slate-200 font-semibold border border-gray-200 dark:border-slate-700 transition-colors"
                            >
                              <Phone size={13} className="text-emerald-600 dark:text-emerald-400" />
                              <span>{place.phone}</span>
                            </a>
                          )}

                          {place.website && (
                            <a
                              href={place.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-slate-900/80 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-800 dark:text-slate-200 font-semibold border border-gray-200 dark:border-slate-700 transition-colors"
                            >
                              <Globe size={13} className="text-blue-600 dark:text-blue-400" />
                              <span>{t("place.visit_website")}</span>
                              <ExternalLink size={11} className="text-gray-400 dark:text-slate-500" />
                            </a>
                          )}

                          {place.instagram && (
                            <a
                              href={`https://instagram.com/${place.instagram.replace("@", "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-pink-50 dark:bg-pink-950/30 hover:bg-pink-100/80 dark:hover:bg-pink-950/50 text-pink-800 dark:text-pink-300 font-semibold border border-pink-200 dark:border-pink-800/60 transition-colors"
                            >
                              <Instagram size={13} className="text-pink-600 dark:text-pink-400" />
                              <span>{place.instagram}</span>
                              <ExternalLink size={11} className="text-pink-400 dark:text-pink-500" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. MENU & PRICES TAB */}
                {activeTab === "menu" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                        <Utensils className="text-[#fabf13] dark:text-[#fabf13]" size={16} />
                        <span>{t("place.menu_pricing_photos")}</span>
                      </h3>
                      {place?.menuImages && place.menuImages.length > 0 && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-950/60 text-yellow-900 dark:text-yellow-300">
                          {place.menuImages.length} {t("place.photos")}
                        </span>
                      )}
                    </div>

                    {place?.menuImages && place.menuImages.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {place.menuImages.map((image: string, index: number) => (
                          <div
                            key={index}
                            className="relative aspect-square rounded-2xl overflow-hidden bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 cursor-pointer group shadow-2xs hover:shadow-md transition-all"
                            onClick={() => {
                              setSelectedMenuIndex(index);
                              setMenuLightboxOpen(true);
                            }}
                          >
                            <img
                              src={getImageUrl(image)}
                              alt={`Menu ${index + 1}`}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-xs font-bold text-white bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs flex items-center gap-1">
                                <ExternalLink size={12} />
                                {t("place.view_full")}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-white dark:bg-[#131b2e] border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2">
                        <Utensils size={24} className="text-gray-300 dark:text-slate-600" />
                        <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                          {t("place.no_menu")}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. ACCESSIBILITY TAB */}
                {activeTab === "accessibility" && (
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-2xs space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-800 dark:text-yellow-400">
                        {t("place.accessibility_features")}
                      </h3>
                      {place.accessibility?.features && place.accessibility.features.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {place.accessibility.features.map((feature: string) => (
                            <div
                              key={feature}
                              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-900/60 border border-gray-100 dark:border-slate-800 rounded-xl text-gray-800 dark:text-slate-200 text-xs font-semibold"
                            >
                              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                                <Accessibility size={14} />
                              </div>
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-slate-400 italic">
                          {t("place.no_accessibility_features")}
                        </p>
                      )}
                    </div>

                    {place.accessibility?.notes && (
                      <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-2xs space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">
                          {t("place.additional_notes")}
                        </h4>
                        <p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed">
                          {getLocalized(place.accessibility.notes, language)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. SERVICES TAB */}
                {activeTab === "services" && (
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-2xs space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-800 dark:text-yellow-400">
                        {t("place.services_available")}
                      </h3>
                      {place.services && place.services.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {place.services.map((service: string) => (
                            <div
                              key={service}
                              className="p-4 bg-gray-50 dark:bg-slate-900/60 border border-gray-100 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2 text-center"
                            >
                              <div className="w-9 h-9 rounded-xl bg-yellow-100 dark:bg-yellow-950/60 text-yellow-900 dark:text-yellow-300 flex items-center justify-center">
                                {getServiceIcon(service)}
                              </div>
                              <span className="text-xs font-bold text-gray-800 dark:text-slate-200">
                                {getServiceLabel(service)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-slate-400 italic text-center py-6">
                          {t("place.no_services_listed")}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. REVIEWS TAB */}
                {activeTab === "reviews" && (
                  <div className="space-y-4">
                    {isReviewsLoading ? (
                      <div className="flex justify-center py-10">
                        <div className="w-8 h-8 border-2 border-[#fabf13] border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : reviews?.data && reviews.data.length > 0 ? (
                      <div className="space-y-4">
                        {/* Rating Summary Card */}
                        <div className="flex items-center gap-5 bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-2xs">
                          <div className="text-center pr-5 border-r border-gray-100 dark:border-slate-800 shrink-0">
                            <div className="text-3xl font-black text-gray-950 dark:text-slate-100 leading-none">
                              {(
                                reviews.data.reduce(
                                  (acc: number, rev: any) => acc + rev.rating,
                                  0
                                ) / reviews.data.length
                              ).toFixed(1)}
                            </div>
                            <div className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                              {t("reviews.average")}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex text-yellow-400 gap-0.5">
                              {Array(5)
                                .fill(0)
                                .map((_, i) => (
                                  <Star
                                    key={i}
                                    size={14}
                                    className="fill-yellow-400 text-yellow-400"
                                  />
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                              {(t("reviews.based_on_customer_reviews") || "Based on {count} customer reviews").replace("{count}", String(reviews.data.length))}
                            </p>
                          </div>
                        </div>

                        {/* Reviews List */}
                        <div className="space-y-3">
                          {reviews.data.map((review: any) => (
                            <div
                              key={review._id}
                              className="bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-800 p-4 sm:p-5 rounded-2xl space-y-3 shadow-2xs"
                            >
                              <div className="flex justify-between items-start gap-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-9 w-9 border border-gray-100 dark:border-slate-800">
                                    <AvatarImage
                                      src={getProfileImageUrl(review?.reviewer?.profile)}
                                    />
                                    <AvatarFallback />
                                  </Avatar>
                                  <div>
                                    <p className="text-xs font-bold text-gray-900 dark:text-slate-100">
                                      {review?.reviewer?.name || t("reviews.anonymous_user")}
                                    </p>
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-slate-500">
                                      <Calendar size={10} />
                                      {new Date(review.createdAt).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex gap-0.5 text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40 px-2 py-0.5 rounded-lg border border-yellow-100 dark:border-yellow-800/60">
                                  {Array(5)
                                    .fill(0)
                                    .map((_, i) => (
                                      <Star
                                        key={i}
                                        size={11}
                                        className={
                                          i < review.rating
                                            ? "fill-yellow-400 text-yellow-400"
                                            : "text-gray-200 dark:text-slate-700"
                                        }
                                      />
                                    ))}
                                </div>
                              </div>

                              <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-300 leading-relaxed bg-gray-50/70 dark:bg-slate-900/60 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                                {getLocalized(review.review, language)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-white dark:bg-[#131b2e] border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl space-y-2">
                        <MessageSquare className="mx-auto h-8 w-8 text-gray-300 dark:text-slate-600" />
                        <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                          {t("reviews.no_reviews_yet_place")}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-[#0b0f19] flex-1 flex items-center justify-center">
            {t("place.failed_to_load")}
          </div>
        )}
      </DialogContent>

      <MenuLightbox
        isOpen={menuLightboxOpen}
        onClose={() => setMenuLightboxOpen(false)}
        images={place?.menuImages || []}
        initialIndex={selectedMenuIndex}
        title={t("place.menu_pricing_photos") || "Menu"}
      />
    </Dialog>
  );
}
