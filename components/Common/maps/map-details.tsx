"use client";

import {
  BarChart3,
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dog,
  Lock,
  Map,
  MapPin,
  Phone,
  Send,
  Star,
  Ticket,
  Timer,
  Toilet,
  User2,
  Utensils,
  Wifi,
  X,
  Maximize2,
  AlertCircle,
  CheckCircle2,
  Edit3,
  Sparkles,
  Instagram,
  Compass,
} from "lucide-react";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";

import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";

import { FavouriteButton } from "@/components/shared/favourite-button";
import { NoImage } from "@/lib/others/others";
import { formatOfferDiscountLabel } from "@/lib/offer-label";
import { formatEntryCost, formatHikeTime, getImageUrl, getUsableMediaList, isVideoUrl, getLocalized, convertTo12Hour, formatLocalizedDifficulty, formatLocalizedSchedule, cleanDescriptionHtml, extractImagesFromHtml } from "@/lib/utils";
import { SafeImage } from "@/components/shared/safe-image";
import { useGetSingleBusinessQuery } from "@/redux/features/business/businessApi";
import { useGetOffersByPlaceOrBusinessIdQuery } from "@/redux/features/offer/offerApi";
import { useGetPlaceDetailsQuery } from "@/redux/features/place/placeApi";
import { normalizePinType, trackUsage } from "@/lib/record-visit";
import { toast } from "sonner";
import { addLocationToRouteDraft, isLocationInRouteDraft } from "@/lib/route-planner-utils";
import {
  useGetReviewsByBusinessQuery,
  useGetReviewsByPlaceQuery,
} from "@/redux/features/review/reviewApi";
import Link from "next/link";
import InfoCard from "./info-card";
import { MenuLightbox } from "./MenuLightbox";
import { ReviewModal } from "./review-modal";
import AddToRouteModal from "@/components/Common/route-planner/add-to-route-modal";
import { useGetProfileQuery } from "@/redux/features/user/userApi";
import { useAppSelector } from "@/redux/hook";
import { selectAccessToken } from "@/redux/features/auth/authSlice";
import { useLoginRequired } from "@/components/shared/login-required-modal";
import { useLanguage } from "@/lib/i18n/LanguageContext";

function LightboxImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return <NoImage />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

export default function MapDetails() {
  const { t, language } = useLanguage();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : (rawId as string);
  const initialType = normalizePinType(searchParams.get("type") || "place");
  const [activeType, setActiveType] = useState<"place" | "business">(
    initialType === "business" ? "business" : "place"
  );
  const [hasFallenBack, setHasFallenBack] = useState(false);

  useEffect(() => {
    setActiveType(initialType === "business" ? "business" : "place");
    setHasFallenBack(false);
  }, [initialType, id]);

  const isBusinessEntity = activeType === "business";
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedReviewForEdit, setSelectedReviewForEdit] = useState<any>(null);

  const accessToken = useAppSelector(selectAccessToken);
  const { data: userProfile, isLoading: isProfileLoading } = useGetProfileQuery({}, { skip: !accessToken });
  const { openLoginRequired } = useLoginRequired();

  const {
    data: placeRes,
    isLoading: isPlaceLoading,
    isFetching: isPlaceFetching,
    status: placeStatus,
    error: placeError,
    isError: isPlaceError,
  } = useGetPlaceDetailsQuery(id, {
    skip: !id || isBusinessEntity,
  });
  const {
    data: businessRes,
    isLoading: isBusinessLoading,
    isFetching: isBusinessFetching,
    status: businessStatus,
    error: businessError,
    isError: isBusinessError,
  } = useGetSingleBusinessQuery(id, {
    skip: !id || !isBusinessEntity,
  });

  // Seamless auto-fallback: if place lookup fails with 404/error, automatically switch to business query
  // so business detail pages load and track visits even when accessed directly without ?type=business
  useEffect(() => {
    if (hasFallenBack) return;
    if (!isBusinessEntity && isPlaceError && !placeRes?.data && (placeError as any)?.status !== 403) {
      setHasFallenBack(true);
      setActiveType("business");
    } else if (isBusinessEntity && isBusinessError && !businessRes?.data) {
      setHasFallenBack(true);
      setActiveType("place");
    }
  }, [hasFallenBack, isBusinessEntity, isPlaceError, isBusinessError, placeRes, businessRes, placeError]);

  const rawData = isBusinessEntity ? businessRes?.data : placeRes?.data;

  const isActuallyBusiness =
    isBusinessEntity ||
    businessRes?.data != null ||
    rawData?.type === "Business" ||
    rawData?.placeType === "Business";

  useEffect(() => {
    if (!id) return;
    trackUsage(isActuallyBusiness ? "business" : "place", id);
  }, [id, isActuallyBusiness]);

  const isLoading = isBusinessEntity
    ? isBusinessLoading || isBusinessFetching || businessStatus === "pending" || businessStatus === "uninitialized"
    : isPlaceLoading || isPlaceFetching || placeStatus === "pending" || placeStatus === "uninitialized";
  const error = isBusinessEntity ? businessError : placeError;

  // Client-side purchase gate — same logic as explore-places.tsx and map.tsx
  const purchasedMaps = Array.isArray(userProfile?.purchasedMaps) ? userProfile.purchasedMaps : [];
  const isAdminOrEditor = ["super_admin", "admin", "map_editor"].includes(userProfile?.role || "");
  const placeMapId = rawData?.map
    ? (typeof rawData.map === "object" ? (rawData.map._id || rawData.map.id) : rawData.map)
    : null;
  const isMapPurchased = isAdminOrEditor || (placeMapId && purchasedMaps.some((m: any) => {
    const mid = typeof m === "object" ? (m._id || m.id) : m;
    return String(mid) === String(placeMapId);
  }));
  // A standard (non-business) place requires map purchase to view details.
  // Wait for profile to resolve so we don't flash the lock screen mid-load.
  const isProfileResolved = !accessToken || !isProfileLoading;
  const isLockedForUser = isProfileResolved && !isActuallyBusiness && !!rawData && !isMapPurchased;

  // Normalize Place vs Business schemas for the shared details UI
  const placeData = useMemo(() => {
    if (!rawData) return null;

    const operatingHoursData =
      (rawData.operatingHours && typeof rawData.operatingHours === "object" ? rawData.operatingHours : null) ||
      (rawData.hours?.schedule && typeof rawData.hours.schedule === "object" && !Array.isArray(rawData.hours.schedule) ? rawData.hours.schedule : null) ||
      (rawData.hours && typeof rawData.hours === "object" && !Array.isArray(rawData.hours) && !rawData.hours.schedule ? rawData.hours : null);

    let derivedSchedules = rawData.schedules || "";
    if (!derivedSchedules && operatingHoursData) {
      const activeDays = Object.entries(operatingHoursData)
        .filter(([_, v]: any) => v && !v.closed && v.open && v.close)
        .map(([day, v]: any) => `${day.slice(0, 3)}: ${convertTo12Hour(v.open)} - ${convertTo12Hour(v.close)}`);
      if (activeDays.length > 0) {
        derivedSchedules = activeDays.join(" · ");
      }
    } else if (!derivedSchedules && Array.isArray(rawData.hours?.schedule)) {
      derivedSchedules = rawData.hours.schedule
        .map((s: any) => {
          const dayName = s.days || s.day;
          return dayName ? `${dayName}: ${convertTo12Hour(s.openTime)} - ${convertTo12Hour(s.closeTime)}` : "";
        })
        .filter(Boolean)
        .join(", ");
    }

    return {
      ...rawData,
      type: isActuallyBusiness ? "Business" : (rawData.type || rawData.placeType || "Place"),
      media: rawData.media?.photos || (Array.isArray(rawData.media) ? rawData.media : []),
      menuImages: [
        ...(Array.isArray(rawData.menuImages) ? rawData.menuImages : []),
        ...(rawData.media?.menu ? (Array.isArray(rawData.media.menu) ? rawData.media.menu : [rawData.media.menu]) : []),
      ].filter(Boolean),
      address: rawData.location?.address || rawData.address || "",
      phone: rawData.contact?.phone || rawData.phone,
      website: rawData.contact?.website || rawData.website,
      instagram: rawData.contact?.instagram || rawData.instagram,
      location: {
        type: "Point",
        coordinates: rawData.location?.mapLocation?.coordinates || rawData.location?.coordinates || [],
      },
      map: { name: rawData.location?.country || rawData.country },
      operatingHours: operatingHoursData,
      schedules: derivedSchedules,
    };
  }, [rawData, isActuallyBusiness]);

  const coordinates = placeData?.location?.coordinates;

  const lat = coordinates?.[1];
  const lng = coordinates?.[0];

  const { data: offersRes, isLoading: isOffersLoading } =
    useGetOffersByPlaceOrBusinessIdQuery(placeData?._id, {
      skip: !placeData?._id,
    });

  // Backend returns a single offer object (findOne), not always an array
  const offersList = Array.isArray(offersRes?.data)
    ? offersRes.data
    : offersRes?.data
      ? [offersRes.data]
      : [];
  const offerId = offersList[0]?._id;

  const { data: placeReviews, isLoading: isPlaceReviewsLoading } =
    useGetReviewsByPlaceQuery(id, {
      skip: !id || isActuallyBusiness,
    });
  const { data: businessReviews, isLoading: isBusinessReviewsLoading } =
    useGetReviewsByBusinessQuery(id, {
      skip: !id || !isActuallyBusiness,
    });
  const reviews = isActuallyBusiness ? businessReviews : placeReviews;
  const isReviewsLoading = isActuallyBusiness
    ? isBusinessReviewsLoading
    : isPlaceReviewsLoading;

  const hasText = useCallback(
    (v?: unknown) => {
      if (v == null) return false;
      const loc = getLocalized(v, language);
      if (!loc || loc === "[object Object]") return false;
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

  const [menuLightboxOpen, setMenuLightboxOpen] = useState(false);
  const [selectedMenuIndex, setSelectedMenuIndex] = useState(0);

  const hoursObj = useMemo(() => {
    const raw =
      placeData?.operatingHours ||
      placeData?.hours?.schedule ||
      placeData?.hours;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return raw as Record<string, { open?: string; close?: string; closed?: boolean }>;
    }
    return null;
  }, [placeData]);

  const formatHours = (): { text: string; node?: React.ReactNode; empty?: boolean } => {
    // 1. Check structured operatingHours object
    if (hoursObj) {
      const dayKeys = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      const shortDays: Record<string, string> = language === "es"
        ? { Monday: "Lun", Tuesday: "Mar", Wednesday: "Mié", Thursday: "Jue", Friday: "Vie", Saturday: "Sáb", Sunday: "Dom" }
        : { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };

      const schedules = dayKeys.map((day) => {
        const item = hoursObj[day];
        if (!item || item.closed || !item.open || !item.close) {
          return { day, shortDay: shortDays[day] || day.slice(0, 3), closed: true, timeStr: language === "es" ? "Cerrado" : "Closed" };
        }
        return { day, shortDay: shortDays[day] || day.slice(0, 3), closed: false, timeStr: `${convertTo12Hour(item.open)} – ${convertTo12Hour(item.close)}` };
      });

      const hasAnyOpen = schedules.some((s) => !s.closed);
      if (!hasAnyOpen) {
        return { text: language === "es" ? "Cerrado temporalmente" : "Temporarily Closed", empty: true };
      }

      interface DayGroup {
        startDay: string;
        endDay: string;
        closed: boolean;
        timeStr: string;
      }
      const groups: DayGroup[] = [];
      let currentGroup: DayGroup | null = null;

      for (const s of schedules) {
        if (!currentGroup) {
          currentGroup = { startDay: s.shortDay, endDay: s.shortDay, closed: s.closed, timeStr: s.timeStr };
        } else if (currentGroup.timeStr === s.timeStr) {
          currentGroup.endDay = s.shortDay;
        } else {
          groups.push(currentGroup);
          currentGroup = { startDay: s.shortDay, endDay: s.shortDay, closed: s.closed, timeStr: s.timeStr };
        }
      }
      if (currentGroup) groups.push(currentGroup);

      // Prefer showing open schedules to keep the card compact and uncluttered
      const openGroups = groups.filter((g) => !g.closed);
      const activeGroups = openGroups.length > 0 ? openGroups : groups;

      const groupLines = activeGroups.map((g) => {
        const dayRange = g.startDay === g.endDay ? g.startDay : `${g.startDay} – ${g.endDay}`;
        return `${dayRange}: ${g.timeStr}`;
      });

      if (groupLines.length === 1) {
        return { text: groupLines[0] };
      }

      return {
        text: groupLines.join(" · "),
        node: (
          <div className="flex flex-col gap-0.5 text-xs font-semibold leading-tight">
            {groupLines.map((line, idx) => (
              <span key={idx} className="truncate">{line}</span>
            ))}
          </div>
        ),
      };
    }

    // 2. Check schedules string / i18n
    if (hasText(placeData?.schedules)) {
      const str = formatLocalizedSchedule(placeData.schedules, language);
      const trimmed = String(str).trim();
      if (
        trimmed &&
        !trimmed.includes("undefined") &&
        !trimmed.startsWith(":") &&
        trimmed !== "-" &&
        !trimmed.includes("?: ? - ?")
      ) {
        return { text: convertTo12Hour(trimmed) };
      }
    }

    // 3. Check hours string
    if (hasText(placeData?.hours) && typeof placeData.hours === "string") {
      const trimmed = formatLocalizedSchedule(placeData.hours, language).trim();
      if (!trimmed.includes("undefined") && !trimmed.startsWith(":") && trimmed !== "-") {
        return { text: convertTo12Hour(trimmed) };
      }
    }

    // 4. Check schedule array
    const schedule =
      placeData?.hours?.schedule ||
      (Array.isArray(placeData?.hours)
        ? placeData.hours
        : Array.isArray(placeData?.schedule)
          ? placeData.schedule
          : null);

    if (Array.isArray(schedule) && schedule.length > 0) {
      const validItems = schedule.filter(
        (s: any) => (s.days || s.day) && (s.openTime || s.closeTime),
      );
      if (validItems.length > 0) {
        const lines = validItems.map((s: any) => {
          const daysRaw = s.days || s.day;
          const days = formatLocalizedSchedule(daysRaw, language);
          const open = convertTo12Hour(s.openTime);
          const close = convertTo12Hour(s.closeTime);
          if (open && close) return `${days}: ${open} – ${close}`;
          if (open) return `${days}: ${open}`;
          if (close) return `${days}: ${close}`;
          return `${days}: ${t("place.closed")}`;
        });
        return {
          text: lines.join(" · "),
          node: (
            <div className="flex flex-col gap-0.5 text-xs font-semibold leading-tight">
              {lines.map((line: string, idx: number) => (
                <span key={idx} className="truncate">{line}</span>
              ))}
            </div>
          ),
        };
      }
    }
    return { text: "", empty: true };
  };

  const formattedHours = formatHours();
  const schedulesValue = formattedHours.node || formattedHours.text;
  const isHoursEmpty = !!formattedHours.empty || !formattedHours.text;

  const entryCostRaw = placeData?.entryCost;
  const entryCostValue = formatEntryCost(entryCostRaw, language);
  const hikeTimeRaw = placeData?.hikeTime;
  const hikeTimeValue = formatHikeTime(hikeTimeRaw);

  const infoData = [
    {
      icon: Clock,
      label: t("place.hours"),
      value: isHoursEmpty ? t("place.hours_not_specified") : schedulesValue,
      empty: isHoursEmpty,
    },
    {
      icon: Ticket,
      label: t("place.entry_cost"),
      value: entryCostValue || t("place.not_listed"),
      empty: !entryCostValue,
    },
    {
      icon: BarChart3,
      label: t("place.difficulty"),
      value: hasText(placeData?.difficulty)
        ? formatLocalizedDifficulty(placeData.difficulty, language)
        : t("place.not_specified"),
      empty: !hasText(placeData?.difficulty),
      highlight: hasText(placeData?.difficulty),
    },
    {
      icon: Timer,
      label: t("place.walking_time"),
      value: hikeTimeValue || t("place.not_specified"),
      empty: !hikeTimeValue,
    },
  ];

  const restaurantData = [
    {
      icon: Clock,
      label: t("place.hours"),
      value: isHoursEmpty ? t("place.hours_not_specified") : schedulesValue,
      empty: isHoursEmpty,
    },
    {
      icon: Ticket,
      label: t("place.atmosphere"),
      value: hasText(placeData?.atmosphere)
        ? getLocalized(placeData.atmosphere, language)
        : t("place.not_specified_yet"),
      empty: !hasText(placeData?.atmosphere),
    },
  ];

  const isBusiness = placeData?.type === "Business";
  const dataToRender = isBusiness ? restaurantData : infoData;

  const rawDescription =
    (hasText(placeData?.description) && getLocalized(placeData.description, language).trim()) ||
    (hasText(placeData?.about) && getLocalized(placeData.about, language).trim()) ||
    "";
  const descriptionText = cleanDescriptionHtml(rawDescription);

  const rawAccess =
    (hasText(placeData?.access) && getLocalized(placeData.access, language).trim()) ||
    (hasText(placeData?.accessDescription) && getLocalized(placeData.accessDescription, language).trim()) ||
    "";
  const accessText = cleanDescriptionHtml(rawAccess);

  const renderFormattedDescription = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 underline font-semibold break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const reviewData: any[] = reviews?.data || [];

  const myReview = useMemo(() => {
    if (!userProfile?._id || !Array.isArray(reviewData)) return null;
    return reviewData.find((rev: any) => {
      const reviewerId = typeof rev.reviewer === "object" ? rev.reviewer?._id : rev.reviewer;
      return reviewerId && String(reviewerId) === String(userProfile._id);
    });
  }, [reviewData, userProfile]);

  const approvedReviews = useMemo(() => {
    if (!Array.isArray(reviewData)) return [];
    return reviewData.filter((rev: any) => rev.status === "Approved");
  }, [reviewData]);

  const otherReviews = useMemo(() => {
    return approvedReviews.filter((rev: any) => {
      const reviewerId = typeof rev.reviewer === "object" ? rev.reviewer?._id : rev.reviewer;
      return !myReview || String(reviewerId) !== String(userProfile?._id);
    });
  }, [approvedReviews, myReview, userProfile]);

  const averageRating = useMemo(() => {
    if (approvedReviews.length > 0) {
      const sum = approvedReviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0);
      return (sum / approvedReviews.length).toFixed(1);
    }
    return placeData?.rating ? Number(placeData.rating).toFixed(1) : null;
  }, [approvedReviews, placeData]);

  const handleOpenReviewModal = () => {
    if (!accessToken) {
      openLoginRequired(
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/maps",
        "write a review",
      );
      return;
    }
    if (myReview) {
      setSelectedReviewForEdit(myReview);
    } else {
      setSelectedReviewForEdit(null);
    }
    setIsReviewOpen(true);
  };

  const resolveServiceInfo = (rawService: any) => {
    if (!rawService) return null;
    const serviceStr = typeof rawService === "string" ? rawService : rawService.name || rawService.label || String(rawService);
    const normalized = serviceStr.toLowerCase().trim();

    if (normalized.includes("park") || normalized.includes("estacionamiento") || normalized.includes("parqueo")) {
      return { icon: Car, label: t("services.parking") || "Parking" };
    }
    if (normalized.includes("restroom") || normalized.includes("baño") || normalized.includes("bano") || normalized.includes("toilet") || normalized.includes("sanitario")) {
      return { icon: Toilet, label: t("services.restrooms") || "Restrooms" };
    }
    if (normalized.includes("food") || normalized.includes("comida") || normalized.includes("restaurante")) {
      return { icon: Utensils, label: t("services.food_nearby") || "Food Nearby" };
    }
    if (normalized.includes("tour") || normalized.includes("guiad") || normalized.includes("guia")) {
      return { icon: MapPin, label: t("services.guided_tour") || "Guided Tour" };
    }
    if (normalized.includes("family") || normalized.includes("famili")) {
      return { icon: User2, label: t("services.family_friendly") || "Family Friendly" };
    }
    if (normalized.includes("wifi") || normalized.includes("wi-fi") || normalized.includes("internet")) {
      return { icon: Wifi, label: t("services.wifi") || "Wi-Fi" };
    }
    if (normalized.includes("pet") || normalized.includes("mascota")) {
      return { icon: Dog, label: t("services.pet_friendly") || "Pet Friendly" };
    }

    return {
      icon: Sparkles,
      label: getLocalized(serviceStr, language) || serviceStr,
    };
  };

  const handleViewOnMap = () => {
    if (!lat || !lng) return;

    const mapName =
      (typeof placeData?.map === "object" && placeData?.map?.name) ||
      placeData?.country ||
      "";

    if (mapName) {
      localStorage.setItem("selectedCountryFilter", mapName);
    }

    const params = new URLSearchParams({
      focus: String(placeData?._id || id || ""),
      type: isBusinessEntity ? "business" : "place",
      lat: String(lat),
      lng: String(lng),
      satellite: "1",
    });
    if (mapName) params.set("map", mapName);

    router.push(`/maps?${params.toString()}`);
  };

  const [isInRoute, setIsInRoute] = useState(false);
  const [isAddToRouteModalOpen, setIsAddToRouteModalOpen] = useState(false);

  useEffect(() => {
    const locId = placeData?._id || id;
    if (locId) {
      setIsInRoute(isLocationInRouteDraft(String(locId)));
    }

    const onDraftChange = () => {
      if (locId) {
        setIsInRoute(isLocationInRouteDraft(String(locId)));
      }
    };

    window.addEventListener("roadtripeado_route_draft_changed", onDraftChange);
    return () => {
      window.removeEventListener("roadtripeado_route_draft_changed", onDraftChange);
    };
  }, [placeData, id]);

  const handleAddToRoute = () => {
    if (!placeData) return;
    setIsAddToRouteModalOpen(true);
  };

  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(
    null,
  );
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isCarouselVideoPlaying, setIsCarouselVideoPlaying] = useState(false);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);

  const videoRefCallback = useCallback((el: HTMLVideoElement | null) => {
    if (el) {
      activeVideoRef.current = el;
      el.play().then(() => {
        setIsCarouselVideoPlaying(true);
      }).catch((err) => {
        console.warn("Autoplay blocked by browser policy:", err);
        setIsCarouselVideoPlaying(false);
      });
    } else {
      if (activeVideoRef.current) {
        activeVideoRef.current.pause();
        activeVideoRef.current.currentTime = 0;
        activeVideoRef.current = null;
        setIsCarouselVideoPlaying(false);
      }
    }
  }, []);

  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [showControls, setShowControls] = useState(true);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lightboxVideoRef = useRef<HTMLVideoElement | null>(null);

  // Reset zoom and position when selected media changes
  useEffect(() => {
    if (selectedMediaIndex !== null) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setShowControls(true);
    }
    // Pause lightbox video when navigating
    if (lightboxVideoRef.current) {
      lightboxVideoRef.current.pause();
    }
  }, [selectedMediaIndex]);

  const mediaList = useMemo(() => {
    const list = getUsableMediaList(placeData?.media);
    const extraImages = extractImagesFromHtml(placeData?.description);
    extraImages.forEach((img) => {
      if (!list.includes(img)) {
        list.push(img);
      }
    });
    return list;
  }, [placeData]);

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setCurrentSlide(carouselApi.selectedScrollSnap());
    onSelect();
    carouselApi.on("select", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi]);

  const isVideo = (url: string) => isVideoUrl(url);

  const openGallery = (index = currentSlide) => {
    if (!mediaList.length) return;
    setSelectedMediaIndex(Math.min(Math.max(index, 0), mediaList.length - 1));
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY > 0) {
      handleZoomOut();
    } else {
      handleZoomIn();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (zoom > 1) {
      setIsDragging(false);
    }
    if (!touchStartRef.current) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - touchStartRef.current.x;
    const dy = touchEndY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    // Detect tap (very small movement, quick duration)
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 300) {
      setShowControls((prev) => !prev);
      touchStartRef.current = null;
      return;
    }

    // Detect swipe (horizontal distance > vertical, fast enough, not zoomed in)
    if (zoom === 1 && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40 && dt < 500) {
      if (dx > 0) {
        // Swipe right -> previous
        setZoom(1);
        setPosition({ x: 0, y: 0 });
        setSelectedMediaIndex((prev) =>
          prev !== null
            ? (prev - 1 + mediaList.length) % mediaList.length
            : null
        );
      } else {
        // Swipe left -> next
        setZoom(1);
        setPosition({ x: 0, y: 0 });
        setSelectedMediaIndex((prev) =>
          prev !== null ? (prev + 1) % mediaList.length : null
        );
      }
    }

    touchStartRef.current = null;
  };

  const handleDirections = () => {
    if (!lat || !lng) {
      console.error("Invalid coordinates");
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    window.open(url, "_blank");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b0f19]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-slate-400 font-medium">{t("place.loading_details")}</p>
        </div>
      </div>
    );
  }

  if (isLockedForUser || (error && ((error as any).status === 403 || (error as any).originalStatus === 403))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b0f19] p-4">
        <div className="text-center space-y-6 max-w-md bg-white dark:bg-[#131b2e] p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-amber-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t("place.unlock_location_title")}</h2>
          <p className="text-gray-600 dark:text-slate-400 leading-relaxed">
            {t("place.unlock_location_desc")}
          </p>
          <div className="pt-4">
            <Link href="/catalog">
              <Button className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-6 rounded-xl shadow-lg shadow-yellow-200 dark:shadow-none transition-all text-lg cursor-pointer">
                <Ticket className="w-5 h-5 mr-2" />
                {t("offer.purchase_map")}
              </Button>
            </Link>
          </div>
          <div className="pt-2">
            <Link href="/maps">
              <Button variant="ghost" className="text-gray-500 dark:text-slate-400 dark:hover:bg-slate-800 w-full cursor-pointer">{t("place.back_to_maps")}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!placeData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b0f19]">
        <div className="text-center space-y-4">
          <p className="text-xl font-bold text-gray-800 dark:text-slate-100">{t("place.place_not_found")}</p>
          <Link href="/maps">
            <Button variant="outline" className="dark:bg-[#131b2e] dark:border-slate-800 dark:text-slate-200 cursor-pointer">{t("place.back_to_map")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="bg-gray-100 dark:bg-[#0b0f19] py-4 sm:py-8 lg:py-10 min-h-screen">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 md:px-6">
        {/* TOP GRID */}
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* LEFT HERO CARD */}
          <div className="lg:col-span-2 space-y-3">
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden group bg-gray-200 aspect-[4/3] sm:aspect-[16/11] lg:aspect-[16/10] min-h-[340px] sm:min-h-[420px] lg:min-h-[500px]">
              <Carousel
                setApi={setCarouselApi}
                opts={{ loop: mediaList.length > 1 }}
                className="w-full h-full"
              >
                <CarouselContent className="h-full ml-0">
                  {mediaList.length > 0 ? (
                    mediaList.map((media: string, index: number) => (
                      <CarouselItem
                        key={index}
                        className="pl-0 h-full basis-full cursor-zoom-in"
                        onClick={() => openGallery(index)}
                      >
                        <div className="relative h-full w-full min-h-[340px] sm:min-h-[420px] lg:min-h-[500px] group">
                          {isVideo(media) ? (
                            <>
                              <video
                                key={`${index}-${currentSlide === index}`}
                                ref={currentSlide === index ? videoRefCallback : undefined}
                                src={`${getImageUrl(media)}#t=0.1`}
                                className="object-cover w-full h-full absolute inset-0"
                                muted
                                loop
                                playsInline
                                preload="auto"
                                crossOrigin="anonymous"
                                autoPlay={currentSlide === index}
                                onPlay={() => setIsCarouselVideoPlaying(true)}
                                onPause={() => setIsCarouselVideoPlaying(false)}
                              />
                              {/* Play/Pause overlay — click to play inline, not open lightbox */}
                              {!isCarouselVideoPlaying || currentSlide !== index ? (
                                <div
                                  className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer z-10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (activeVideoRef.current) {
                                      activeVideoRef.current.play();
                                    }
                                  }}
                                >
                                  <div className="bg-black/50 backdrop-blur-sm text-white rounded-full p-5 shadow-2xl group-hover:scale-110 transition-transform duration-200 border border-white/20">
                                    <svg className="w-10 h-10 fill-current ml-1" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  </div>
                                  <span className="mt-3 text-white/80 text-xs font-medium tracking-widest uppercase bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">{t("place.click_to_play")}</span>
                                </div>
                              ) : (
                                <div
                                  className="absolute inset-0 flex items-end justify-center pb-6 cursor-pointer z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (activeVideoRef.current) {
                                      activeVideoRef.current.pause();
                                    }
                                  }}
                                >
                                  <div className="bg-black/50 backdrop-blur-sm text-white rounded-full p-3 shadow-xl border border-white/20">
                                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                    </svg>
                                  </div>
                                </div>
                              )}

                            </>
                          ) : (
                            <SafeImage
                              src={getImageUrl(media)}
                              alt={`${placeData?.name} photo ${index + 1}`}
                              fill
                              unoptimized
                              className="object-cover object-center"
                              sizes="(max-width: 1024px) 100vw, 66vw"
                            />
                          )}
                        </div>
                      </CarouselItem>
                    ))
                  ) : (
                    <CarouselItem className="pl-0 h-full basis-full">
                      <div className="min-h-[250px] md:min-h-[420px] flex items-center justify-center bg-gray-100 dark:bg-slate-900">
                        <NoImage />
                      </div>
                    </CarouselItem>
                  )}
                </CarouselContent>

                {/* Carousel Navigation Arrows: Hidden on mobile, visible on desktop/tablet */}
                {mediaList.length > 1 && (
                  <>
                    <CarouselPrevious className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 size-10 md:size-12 !border-0 !bg-black/50 hover:!bg-black/75 !text-white hover:!text-white shadow-lg disabled:opacity-30 cursor-pointer" />
                    <CarouselNext className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 size-10 md:size-12 !border-0 !bg-black/50 hover:!bg-black/75 !text-white hover:!text-white shadow-lg disabled:opacity-30 cursor-pointer" />
                  </>
                )}
              </Carousel>

              {/* Bottom gradient overlay: Desktop only to support overlay title card; hidden on mobile to keep photo crisp */}
              <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

              <div className="absolute top-3.5 sm:top-4 left-3.5 sm:left-4 z-20 flex items-center gap-2">
                <FavouriteButton
                  placeId={id}
                  type={isBusinessEntity ? "Business" : "Place"}
                  Style="w-9 h-9 sm:w-11 sm:h-11 border border-black/5 dark:border-white/10 bg-white/95 dark:bg-[#131b2e]/95 hover:bg-white dark:hover:bg-[#1e293b] hover:scale-105 active:scale-95 shadow-md p-2 sm:p-2.5 rounded-xl transition-all duration-200 cursor-pointer backdrop-blur-sm"
                />
                <button
                  type="button"
                  onClick={handleAddToRoute}
                  title={isInRoute ? (language === "es" ? "En tu ruta (Ver ruta)" : "In your route (View)") : (language === "es" ? "Añadir a la Ruta" : "Add to Route")}
                  aria-label={language === "es" ? "Añadir a la Ruta" : "Add to Route"}
                  className={`w-9 h-9 sm:w-11 sm:h-11 border rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer backdrop-blur-sm shadow-md hover:scale-105 active:scale-95 ${
                    isInRoute
                      ? "bg-emerald-500/90 text-white border-emerald-400"
                      : "bg-white/95 dark:bg-[#131b2e]/95 text-amber-600 dark:text-amber-400 border-black/5 dark:border-white/10 hover:bg-white dark:hover:bg-[#1e293b]"
                  }`}
                >
                  {isInRoute ? <CheckCircle2 size={17} className="sm:size-[19px]" /> : <Compass size={17} className="sm:size-[19px]" />}
                </button>
              </div>

              {mediaList.length > 0 && (
                <>
                  {/* Slide Counter Badge: Aligned nicely on mobile without the fullscreen button */}
                  <div className="absolute top-3.5 sm:top-4 right-3.5 sm:right-17 z-20 rounded-full bg-black/55 px-2.5 sm:px-3 py-1 sm:py-2 text-[11px] sm:text-xs font-bold text-white backdrop-blur-sm pointer-events-none select-none flex items-center justify-center h-8 sm:h-11">
                    {currentSlide + 1} / {mediaList.length}
                  </div>

                  {/* Smart Fullscreen Square Icon Button: Hidden on mobile, desktop/tablet only */}
                  <button
                    type="button"
                    title="Fullscreen"
                    className="hidden sm:flex absolute top-4 right-4 z-20 w-11 h-11 border-none bg-black/50 hover:bg-black/75 text-white hover:scale-105 active:scale-95 shadow-md items-center justify-center rounded-xl transition-all duration-200 cursor-pointer backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      const isVid = isVideo(mediaList[currentSlide]);
                      if (isVid && activeVideoRef.current) {
                        const vid = activeVideoRef.current;
                        const onFullscreenChange = () => {
                          const isFs = document.fullscreenElement === vid || 
                                       (document as any).webkitFullscreenElement === vid ||
                                       (document as any).msFullscreenElement === vid;
                          if (!isFs) {
                            vid.controls = false;
                            document.removeEventListener("fullscreenchange", onFullscreenChange);
                            document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
                          }
                        };

                        vid.controls = true;
                        document.addEventListener("fullscreenchange", onFullscreenChange);
                        document.addEventListener("webkitfullscreenchange", onFullscreenChange);

                        if (vid.requestFullscreen) vid.requestFullscreen();
                        else if ((vid as any).webkitRequestFullscreen) (vid as any).webkitRequestFullscreen();
                        else if ((vid as any).msRequestFullscreen) (vid as any).msRequestFullscreen();
                      } else {
                        openGallery(currentSlide);
                      }
                    }}
                  >
                    <Maximize2 size={18} className="shrink-0" />
                  </button>
                </>
              )}

              {/* Bottom title card (Desktop Only) */}
              <div className="hidden md:block absolute bottom-0 inset-x-0 z-10 p-3 md:p-4 pointer-events-none">
                {mediaList.length > 1 && (
                  <div className="mb-3 flex justify-center gap-1.5 pointer-events-auto">
                    {mediaList.map((_: string, index: number) => (
                      <button
                        key={index}
                        type="button"
                        aria-label={`Go to photo ${index + 1}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          carouselApi?.scrollTo(index);
                        }}
                        className={`h-1.5 rounded-full transition-all ${currentSlide === index
                            ? "w-6 bg-yellow-400"
                            : "w-1.5 bg-white/55 hover:bg-white"
                          }`}
                      />
                    ))}
                  </div>
                )}

                <div className="rounded-2xl border border-white/15 bg-black/45 px-4 py-3.5 md:px-5 md:py-4 backdrop-blur-md shadow-lg pointer-events-auto">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {placeData?.category?.name && (
                      <span className="inline-flex items-center rounded-full bg-yellow-400/95 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-black">
                        {getLocalized(placeData.category.name, language)}
                      </span>
                    )}
                    {typeof placeData?.rating === "number" &&
                      placeData.rating > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                          <Star
                            size={12}
                            className="fill-yellow-400 text-yellow-400"
                          />
                          {placeData.rating.toFixed(1)}
                          {placeData?.totalReview > 0 && (
                            <span className="font-normal text-white/70">
                              ({placeData.totalReview})
                            </span>
                          )}
                        </span>
                      )}
                  </div>

                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-public-sans text-white leading-tight tracking-tight" style={{userSelect:'text'}}>
                    {getLocalized(placeData?.name, language) || "Untitled location"}
                  </h1>

                  {(placeData?.discoveredByName || placeData?.discoveredBy?.name) && (
                    <div className="mt-2.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-xs font-semibold text-amber-200 w-fit backdrop-blur-xs">
                      <Sparkles size={13} className="text-amber-300 fill-amber-300 shrink-0" />
                      <span>
                        {language === "es" ? "Descubierto por" : "Discovered by"}{" "}
                        {(() => {
                          const discovererName = placeData.discoveredByName || placeData.discoveredBy?.name;
                          const discovererId =
                            typeof placeData.discoveredBy === "object"
                              ? placeData.discoveredBy?._id || placeData.discoveredBy?.id
                              : placeData.discoveredBy;

                          if (discovererId) {
                            return (
                              <Link
                                href={`/explorer/${discovererId}`}
                                className="font-bold underline decoration-amber-400/60 hover:text-white transition-colors"
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

                  <div className="mt-2 flex items-start gap-2 text-sm text-white/90">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EC5B13]/20">
                      <MapPin size={13} className="text-[#FF8A4C]" />
                    </span>
                    <span className="leading-snug pt-0.5" style={{userSelect:'text'}}>
                      {placeData?.address || "Address not available"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile-Only Title Card (Below the image) */}
            <div className="md:hidden mt-3 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] px-4 py-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {placeData?.category?.name && (
                  <span className="inline-flex items-center rounded-full bg-yellow-400 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-black">
                    {getLocalized(placeData.category.name, language)}
                  </span>
                )}
                {typeof placeData?.rating === "number" && placeData.rating > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-gray-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700">
                    <Star size={12} className="fill-yellow-400 text-yellow-400" />
                    {placeData.rating.toFixed(1)}
                    {placeData?.totalReview > 0 && (
                      <span className="font-normal text-gray-500 dark:text-slate-400">
                        ({placeData.totalReview})
                      </span>
                    )}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-bold font-public-sans text-gray-900 dark:text-slate-100 leading-tight tracking-tight" style={{userSelect:'text'}}>
                {getLocalized(placeData?.name, language) || "Untitled location"}
              </h1>

              {(placeData?.discoveredByName || placeData?.discoveredBy?.name) && (
                <div className="mt-2.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/25 dark:border-amber-400/20 text-xs font-semibold text-amber-900 dark:text-amber-200 w-fit">
                  <Sparkles size={13} className="text-amber-500 fill-amber-500 shrink-0" />
                  <span>
                    {language === "es" ? "Descubierto por" : "Discovered by"}{" "}
                    {(() => {
                      const discovererName = placeData.discoveredByName || placeData.discoveredBy?.name;
                      const discovererId =
                        typeof placeData.discoveredBy === "object"
                          ? placeData.discoveredBy?._id || placeData.discoveredBy?.id
                          : placeData.discoveredBy;

                      if (discovererId) {
                        return (
                          <Link
                            href={`/explorer/${discovererId}`}
                            className="font-bold underline decoration-amber-500/50 hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
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

              <div className="mt-2 flex items-start gap-2 text-sm text-gray-600 dark:text-slate-400">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EC5B13]/10">
                  <MapPin size={13} className="text-[#FF8A4C]" />
                </span>
                <span className="leading-snug pt-0.5" style={{userSelect:'text'}}>
                  {placeData?.address || "Address not available"}
                </span>
              </div>
            </div>

          </div>

          {/* RIGHT SIDE INFO */}
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {(dataToRender.some((i) => !i.empty)
                ? dataToRender.filter((i) => !i.empty)
                : dataToRender
              ).map((item, index) => {
                const Icon = item.icon;

                return (
                  <InfoCard
                    key={index}
                    icon={<Icon size={18} />}
                    label={item.label}
                    value={item.value}
                    highlight={(item as any)?.highlight}
                    empty={(item as any)?.empty}
                  />
                );
              })}
            </div>

            <div className="flex flex-col gap-2 mt-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleViewOnMap}
                  className="w-full inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-yellow-400 hover:bg-yellow-500 text-black dark:text-slate-950 font-bold h-11 px-2 text-xs sm:text-sm rounded-xl transition-all duration-200 hover:shadow-md cursor-pointer"
                >
                  <Map size={16} className="shrink-0" />
                  <span className="truncate">{t("place.view_on_map")}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDirections}
                  className="w-full inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-yellow-400 hover:bg-yellow-500 text-black dark:text-slate-950 font-bold h-11 px-2 text-xs sm:text-sm rounded-xl transition-all duration-200 hover:shadow-md cursor-pointer"
                >
                  <Send size={16} className="shrink-0" />
                  <span className="truncate">{t("place.directions")}</span>
                </button>
              </div>

              {isBusiness && (hasText(placeData?.phone) || offerId) && (
                <div className={`grid gap-2 ${hasText(placeData?.phone) && offerId ? "grid-cols-2" : "grid-cols-1"}`}>
                  {hasText(placeData?.phone) && (
                    <a href={`tel:${placeData.phone}`} className="w-full block">
                      <button type="button" className="w-full inline-flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black dark:text-slate-950 font-bold h-11 px-2 text-xs sm:text-sm rounded-xl transition-all duration-200 hover:shadow-md cursor-pointer">
                        <Phone size={16} className="shrink-0" />
                        <span className="truncate">{t("place.call")}</span>
                      </button>
                    </a>
                  )}
                  {offerId && (
                    <Link href={`/offer/${offerId}`} className="w-full block">
                      <button type="button" className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11 px-2 text-xs sm:text-sm rounded-xl transition-all duration-200 hover:shadow-md cursor-pointer">
                        <Ticket size={16} className="shrink-0" />
                        <span className="truncate">{t("place.discounts")}</span>
                      </button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ACCORDIONS */}
        <div className="mt-8 sm:mt-10 space-y-3 sm:space-y-4">
          <Accordion
            type="single"
            collapsible
            defaultValue="access"
            className="space-y-3 sm:space-y-4"
          >
            {/* ACCESS / DESCRIPTION */}
            {(descriptionText || accessText) && (
              <AccordionItem
                value="access"
                className="border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#131b2e] overflow-hidden"
              >
                <AccordionTrigger className="font-semibold px-4 sm:px-6 hover:no-underline dark:text-slate-100 text-sm sm:text-base">
                  {isBusiness ? t("place.description_and_access") : t("place.about_this_place")}
                </AccordionTrigger>

                <AccordionContent className="text-muted-foreground space-y-4 px-4 sm:px-6 pb-4 sm:pb-6 text-sm sm:text-base">
                  {descriptionText && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2">
                        {t("place.description")}
                      </p>
                      <p className="leading-relaxed text-gray-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                        {renderFormattedDescription(descriptionText)}
                      </p>
                    </div>
                  )}

                  {accessText && (
                    <div className={descriptionText ? "pt-3 border-t border-gray-100 dark:border-slate-800" : ""}>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2">
                        {t("place.access_and_getting_here")}
                      </p>
                      <p className="leading-relaxed text-gray-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                        {renderFormattedDescription(accessText)}
                      </p>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            )}

            {/* RECOMMENDATIONS */}
            {!isBusiness &&
              (hasText(placeData?.recommendations?.tips) ||
                hasText(placeData?.details?.recommendations) ||
                (placeData?.accessibility?.features && placeData.accessibility.features.length > 0) ||
                hasText(placeData?.accessibility?.notes)) && (
                <AccordionItem
                  value="recommendations"
                  className="border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#131b2e] overflow-hidden"
                >
                  <AccordionTrigger className="font-semibold px-4 sm:px-6 hover:no-underline dark:text-slate-100 text-sm sm:text-base">
                    {t("place.recommendations")}
                  </AccordionTrigger>

                  <AccordionContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-5 text-sm sm:text-base">
                    {(hasText(placeData?.recommendations?.tips) || hasText(placeData?.details?.recommendations)) && (
                      <p className="leading-relaxed text-gray-700 dark:text-slate-300">
                        {getLocalized(placeData?.recommendations?.tips, language) ||
                          getLocalized(placeData?.details?.recommendations, language)}
                      </p>
                    )}

                    {((placeData?.accessibility?.features && placeData.accessibility.features.length > 0) ||
                      hasText(placeData?.accessibility?.notes)) && (
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                          {t("place.accessibility_features")}
                        </p>
                        {placeData?.accessibility?.features?.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {placeData.accessibility.features.map((feature: string) => (
                              <span
                                key={feature}
                                className="text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-900/50 capitalize"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        )}
                        {hasText(placeData?.accessibility?.notes) && (
                          <p className="text-sm italic text-gray-500 dark:text-slate-400">
                            {getLocalized(placeData.accessibility.notes, language)}
                          </p>
                        )}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )}

            {/* SERVICES */}
            {!isBusiness && placeData?.services?.length > 0 && (
              <AccordionItem
                value="services"
                className="border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#131b2e] overflow-hidden"
              >
                <AccordionTrigger className="font-semibold px-4 sm:px-6 hover:no-underline dark:text-slate-100 text-sm sm:text-base">
                  {t("place.services_available")}
                </AccordionTrigger>

                <AccordionContent className="px-4 sm:px-6 pb-6 sm:pb-8">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 gap-3 sm:gap-6 text-center">
                    {placeData.services.map((item: any, idx: number) => {
                      const serviceInfo = resolveServiceInfo(item);
                      if (!serviceInfo) return null;
                      const Icon = serviceInfo.icon;

                      return (
                        <div
                          key={idx}
                          className="flex flex-col items-center gap-1.5 sm:gap-2 group"
                        >
                          <div className="bg-gray-50 dark:bg-[#0e1424] p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-slate-800 group-hover:bg-amber-50 dark:group-hover:bg-amber-950/20 transition-colors">
                            <Icon size={20} className="sm:size-[22px] text-gray-600 dark:text-slate-300 group-hover:text-amber-600 dark:group-hover:text-amber-400" />
                          </div>
                          <p className="text-[9px] sm:text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-tight line-clamp-2">
                            {serviceInfo.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* MENU & PRICES */}
            {placeData?.menuImages && placeData.menuImages.length > 0 && (
              <AccordionItem
                value="menu"
                className="border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#131b2e] overflow-hidden"
              >
                <AccordionTrigger className="font-semibold px-4 sm:px-6 hover:no-underline dark:text-slate-100 text-sm sm:text-base">
                  {t("place.menu_and_prices")}
                </AccordionTrigger>

                <AccordionContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {placeData.menuImages.map((image: string, index: number) => (
                      <div
                        key={index}
                        className="relative aspect-square rounded-lg overflow-hidden border border-gray-100 dark:border-slate-800 cursor-zoom-in group"
                        onClick={() => {
                          setSelectedMenuIndex(index);
                          setMenuLightboxOpen(true);
                        }}
                      >
                        <img
                          src={getImageUrl(image)}
                          alt={`Menu ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                        />
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* OFFERS & DISCOUNTS */}
            {offersList.length > 0 && (
              <AccordionItem
                value="offers"
                className="border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#131b2e] overflow-hidden"
              >
                <AccordionTrigger className="font-semibold px-4 sm:px-6 hover:no-underline text-blue-600 dark:text-blue-400 text-sm sm:text-base">
                  <div className="flex items-center gap-2">
                    <Ticket size={20} />
                    {t("place.offers_and_discounts")} ({offersList.length})
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
                  <div className="grid gap-3 sm:gap-4">
                    {offersList.map((offer: any) => (
                      <div
                        key={offer._id}
                        className="p-3.5 sm:p-4 border border-blue-100 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/20 rounded-xl relative overflow-hidden group hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                      >
                        <div className="flex justify-between items-start gap-3 sm:gap-4">
                          <div className="flex-1 space-y-1">
                            <h4 className="font-bold text-base sm:text-lg text-gray-900 dark:text-slate-100 leading-tight">
                              {offer.title}
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 line-clamp-2">
                              {offer.description}
                            </p>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                              <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded uppercase">
                                {formatOfferDiscountLabel(offer)}
                              </span>
                              {offer.validUntil && (
                                <span className="text-[10px] font-bold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded uppercase">
                                  {t("offer.valid_until")}:{" "}
                                  {new Date(
                                    offer.validUntil,
                                  ).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <Link href={`/offer/${offer._id}`} className="shrink-0">
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 sm:px-4 h-auto rounded-lg">
                              {t("place.redeem_btn")}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
          {!isBusiness && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3.5 sm:p-4 mt-6">
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                {t("place.notice_disclaimer")}
              </p>
            </div>
          )}
        </div>

        {/* Dedicated Operating Hours Card */}
        {hoursObj && Object.keys(hoursObj).length > 0 && (
          <div className="mt-8 sm:mt-10">
            <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <Clock size={18} className="sm:size-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base sm:text-xl uppercase tracking-tight text-gray-900 dark:text-slate-100">
                      {t("places_admin.operating_hours") || "Operating Hours"}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {t("place.weekly_schedule") || "Weekly business hours"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {Object.entries(hoursObj).map(([day, hours]: any) => {
                  const dayLabels: Record<string, string> = {
                    Monday: "Lunes",
                    Tuesday: "Martes",
                    Wednesday: "Miércoles",
                    Thursday: "Jueves",
                    Friday: "Viernes",
                    Saturday: "Sábado",
                    Sunday: "Domingo",
                  };
                  const displayDay = language === "es" ? (dayLabels[day] || day) : day;

                  return (
                    <div
                      key={day}
                      className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50/60 dark:bg-[#0e1424] hover:bg-gray-100/70 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-300">{displayDay}</span>
                      {hours?.closed ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900/40">
                          {t("place.closed") || "Closed"}
                        </span>
                      ) : (
                        <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100">
                          {hours?.open ? convertTo12Hour(hours.open) : "—"} – {hours?.close ? convertTo12Hour(hours.close) : "—"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {(hasText(placeData?.website) || hasText(placeData?.instagram)) && (
          <div className="mt-6 sm:mt-8">
            <h3 className="font-black text-lg sm:text-xl uppercase tracking-tight text-gray-900 dark:text-slate-100 mb-1 sm:mb-2">
              {t("place.online_presence")}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mb-4 sm:mb-6">
              {t("place.online_presence_desc")}
            </p>
            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
              {/* WEBSITE */}
              {hasText(placeData?.website) && (
                <div className="flex items-center justify-between p-3 sm:p-5 gap-2 sm:gap-4 border border-gray-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#131b2e] shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <div className="bg-blue-50 dark:bg-blue-950/40 p-2 sm:p-3 rounded-xl shrink-0 text-base sm:text-lg">🌐</div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                        {t("business_details.website")}
                      </p>
                      <p className="font-bold text-gray-900 dark:text-slate-100 truncate text-xs sm:text-base">
                        {t("place.official_website")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const url = placeData.website.startsWith("http")
                        ? placeData.website
                        : `https://${placeData.website}`;
                      window.open(url, "_blank");
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-5 py-2 rounded-xl font-bold text-xs uppercase transition-colors shrink-0 cursor-pointer"
                  >
                    {t("place.visit")}
                  </button>
                </div>
              )}

              {/* INSTAGRAM */}
              {hasText(placeData?.instagram) && (
                <div className="flex items-center justify-between p-3 sm:p-5 gap-2 sm:gap-4 border border-gray-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#131b2e] shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <div className="bg-pink-50 dark:bg-pink-950/40 p-2 sm:p-3 rounded-xl shrink-0 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                      <Instagram size={20} className="sm:size-[22px] text-pink-600 dark:text-pink-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                        {t("business_details.instagram")}
                      </p>
                      <p className="font-bold text-gray-900 dark:text-slate-100 truncate text-xs sm:text-base">
                        {`@${placeData.instagram.replace("@", "")}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const username = placeData.instagram
                        .replace("@", "")
                        .trim();
                      window.open(
                        `https://instagram.com/${username}`,
                        "_blank",
                      );
                    }}
                    className="bg-pink-600 hover:bg-pink-700 text-white px-3 sm:px-5 py-2 rounded-xl font-bold text-xs uppercase transition-colors shrink-0 cursor-pointer"
                  >
                    {t("place.view")}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {/* REVIEWS & EXPERIENCES SECTION */}
        <div className="mt-8 sm:mt-12 bg-white dark:bg-[#131b2e] rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-gray-100 dark:border-slate-800 pb-4 sm:pb-6">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg sm:text-2xl uppercase tracking-tight text-gray-900 dark:text-slate-100">
                  {t("reviews.reviews_and_experiences")}
                </h3>
                <span className="text-xs font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/40">
                  {approvedReviews.length}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
                {t("reviews.community_feedback_desc")}
              </p>
            </div>

            <Button
              onClick={handleOpenReviewModal}
              className="w-full sm:w-auto bg-amber-400 hover:bg-amber-500 text-black font-black px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm uppercase tracking-wider shadow-sm hover:shadow-md transition-all active:scale-95 shrink-0 border-none flex items-center justify-center gap-2 cursor-pointer"
            >
              {myReview ? (
                <>
                  <Edit3 size={15} /> {t("reviews.edit_your_review")}
                </>
              ) : (
                <>
                  <Star size={15} className="fill-black" /> {t("reviews.write_review")}
                </>
              )}
            </Button>
          </div>

          {/* Rating Summary Highlight */}
          <div className="bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-transparent dark:from-amber-950/20 dark:via-slate-900/50 dark:to-transparent p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-amber-100/80 dark:border-amber-500/20 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-slate-100 tracking-tight flex items-baseline gap-1">
                <span>{averageRating || "0.0"}</span>
                <span className="text-sm sm:text-lg text-gray-400 dark:text-slate-500 font-semibold">/ 5</span>
              </div>
              <div className="space-y-1">
                <div className="flex gap-0.5 sm:gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={16}
                      className={
                        star <= Math.round(Number(averageRating) || 0)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-200 dark:text-slate-700"
                      }
                    />
                  ))}
                </div>
                <p className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-slate-400">
                  {approvedReviews.length > 0
                    ? `${t("reviews.based_on_reviews")} ${approvedReviews.length} ${t("reviews.verified_reviews")}`
                    : isMapPurchased
                      ? t("reviews.no_reviews_yet")
                      : t("reviews.no_reviews_yet_unpurchased")}
                </p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 bg-white/80 dark:bg-[#0e1424] backdrop-blur-xs border border-amber-200/60 dark:border-amber-500/30 px-3.5 py-2 rounded-xl text-xs text-amber-900 dark:text-amber-300 font-bold">
              <Sparkles size={16} className="text-amber-500" />
              <span>
                {isMapPurchased
                  ? t("reviews.earn_points_banner")
                  : t("reviews.unlock_map_to_earn_points")}
              </span>
            </div>
          </div>

          {/* User's own review if Pending or Rejected */}
          {myReview && myReview.status !== "Approved" && (
            <div
              className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border-2 transition-all ${
                myReview.status === "Pending"
                  ? "bg-amber-50/90 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60 shadow-sm"
                  : "bg-red-50/90 dark:bg-red-950/20 border-red-200 dark:border-red-900/40"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] sm:text-xs font-black uppercase tracking-wider px-2.5 sm:px-3 py-1 rounded-full flex items-center gap-1.5 ${
                      myReview.status === "Pending"
                        ? "bg-amber-200 dark:bg-amber-900/50 text-amber-950 dark:text-amber-200"
                        : "bg-red-200 dark:bg-red-900/50 text-red-950 dark:text-red-200"
                    }`}
                  >
                    {myReview.status === "Pending" ? (
                      <>
                        <Clock size={13} className="animate-spin" />
                        {t("reviews.under_review")}
                      </>
                    ) : (
                      <>
                        <AlertCircle size={13} />
                        {t("reviews.needs_revision")}
                      </>
                    )}
                  </span>
                  <span className="text-[11px] sm:text-xs text-gray-500 dark:text-slate-400 font-medium">
                    {t("reviews.visible_only_to_you")}
                  </span>
                </div>

                <Button
                  onClick={handleOpenReviewModal}
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-bold text-xs border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-300 flex items-center gap-1.5 h-8 px-3 cursor-pointer"
                >
                  <Edit3 size={13} />
                  {myReview.status === "Pending" ? t("reviews.edit_review") : t("reviews.edit_and_resubmit")}
                </Button>
              </div>

              <p className="text-xs text-amber-900 dark:text-amber-300 font-medium mb-3 leading-relaxed">
                {myReview.status === "Pending"
                  ? isMapPurchased
                    ? t("reviews.thank_you_pending")
                    : t("reviews.thank_you_pending_no_points")
                  : t("reviews.rejected_desc")}
              </p>

              {/* Card preview of the user's pending review */}
              <div className="bg-white/90 dark:bg-[#0e1424] rounded-xl p-3 sm:p-4 border border-amber-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        size={14}
                        className={
                          i <= myReview.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-200 dark:text-slate-700"
                        }
                      />
                    ))}
                    <span className="text-xs font-bold text-gray-700 dark:text-slate-300 ml-1.5">
                      {myReview.rating}.0
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400 dark:text-slate-500">
                    {t("reviews.submitted_on")}{" "}
                    {new Date(myReview.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-slate-300 italic">
                  "{getLocalized(myReview.review, language) || t("reviews.star_only")}"
                </p>
              </div>
            </div>
          )}

          {/* User's own review if already Approved */}
          {myReview && myReview.status === "Approved" && (
            <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-green-50/60 dark:bg-green-950/20 border border-green-200/80 dark:border-green-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/50 text-green-900 dark:text-green-300 flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-green-600 dark:text-green-400" />
                    {t("reviews.your_published_review")}
                  </span>
                  {(myReview.pointsEarned || 0) > 0 ? (
                    <span className="text-xs font-bold text-green-700 dark:text-green-400">
                      +{myReview.pointsEarned} {t("reviews.points_earned")}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full">
                      {t("reviews.unpurchased_map_notice_short")}
                    </span>
                  )}
                </div>
                <Button
                  onClick={handleOpenReviewModal}
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-bold text-xs border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-950/40 text-green-900 dark:text-green-300 flex items-center gap-1.5 h-8 px-3 cursor-pointer"
                >
                  <Edit3 size={13} /> {t("common.edit")}
                </Button>
              </div>

              <div className="bg-white dark:bg-[#0e1424] rounded-xl p-3 sm:p-4 border border-green-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        size={14}
                        className={
                          i <= myReview.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-200 dark:text-slate-700"
                        }
                      />
                    ))}
                    <span className="text-xs font-bold text-gray-700 dark:text-slate-300 ml-1.5">
                      {myReview.rating}.0
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400 dark:text-slate-500">
                    {new Date(myReview.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-800 dark:text-slate-200 leading-relaxed">
                  {getLocalized(myReview.review, language) || <span className="italic text-gray-400 dark:text-slate-500">{t("reviews.rated_stars_only").replace("{rating}", String(myReview.rating))}</span>}
                </p>
              </div>
            </div>
          )}

          {/* Community Reviews List */}
          {isReviewsLoading ? (
            <div className="py-12 text-center text-gray-400 dark:text-slate-500 space-y-2">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium">{t("reviews.loading_reviews")}</p>
            </div>
          ) : otherReviews.length === 0 && (!myReview || myReview.status !== "Approved") ? (
            <div className="py-12 text-center text-gray-500 dark:text-slate-400 bg-gray-50/50 dark:bg-[#0e1424] rounded-2xl border border-dashed border-gray-200 dark:border-slate-800 space-y-2">
              <p className="text-base font-bold text-gray-700 dark:text-slate-200">{t("reviews.no_public_reviews")}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 max-w-sm mx-auto">
                {isMapPurchased
                  ? t("reviews.first_to_share")
                  : t("reviews.first_to_share_unpurchased")}
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {otherReviews.map((rev: any) => (
                <div
                  key={rev._id}
                  className="bg-gray-50/70 hover:bg-gray-50 dark:bg-[#0e1424] dark:hover:bg-slate-800/60 border border-gray-100 dark:border-slate-800/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 transition-all space-y-2.5 sm:space-y-3"
                >
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    {rev.reviewer?._id || rev.reviewer?.id ? (
                      <Link
                        href={`/explorer/${rev.reviewer._id || rev.reviewer.id}`}
                        className="flex items-center gap-2.5 sm:gap-3 group/user min-w-0"
                      >
                        <Avatar className="w-11 h-11 border-2 border-white dark:border-slate-800 shadow-xs shrink-0 group-hover/user:scale-105 transition-transform">
                          <AvatarImage
                            src={getImageUrl(rev.reviewer?.profile)}
                            alt={rev.reviewer?.name}
                          />
                          <AvatarFallback className="capitalize bg-gradient-to-br from-amber-100 to-yellow-200 text-yellow-900 font-black text-sm">
                            {rev.reviewer?.name?.slice(0, 2) || "EX"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 dark:text-slate-100 text-sm group-hover/user:text-amber-600 dark:group-hover/user:text-amber-400 transition-colors">
                              {rev.reviewer?.name || t("reviews.explorer")}
                            </span>
                            <span className="text-[10px] font-black bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/50 px-2 py-0.5 rounded-full uppercase tracking-tight">
                              {t("reviews.level")} {rev.reviewer?.level || 0}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-400 dark:text-slate-500">
                            {new Date(rev.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Avatar className="w-11 h-11 border-2 border-white dark:border-slate-800 shadow-xs shrink-0">
                          <AvatarImage
                            src={getImageUrl(rev.reviewer?.profile)}
                            alt={rev.reviewer?.name}
                          />
                          <AvatarFallback className="capitalize bg-gradient-to-br from-amber-100 to-yellow-200 text-yellow-900 font-black text-sm">
                            {rev.reviewer?.name?.slice(0, 2) || "EX"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 dark:text-slate-100 text-sm">
                              {rev.reviewer?.name || t("reviews.explorer")}
                            </span>
                            <span className="text-[10px] font-black bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/50 px-2 py-0.5 rounded-full uppercase tracking-tight">
                              {t("reviews.level")} {rev.reviewer?.level || 0}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-400 dark:text-slate-500">
                            {new Date(rev.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 bg-white dark:bg-[#131b2e] border border-gray-100 dark:border-slate-700 px-2.5 py-1 rounded-xl shadow-2xs">
                      <Star size={13} className="fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-bold text-gray-900 dark:text-slate-100">
                        {rev.rating}.0
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                    {getLocalized(rev.review, language) || (
                      <span className="italic text-gray-400 dark:text-slate-500">
                        {t("reviews.rated_stars_only").replace("{rating}", String(rev.rating))}
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => {
          setIsReviewOpen(false);
          setSelectedReviewForEdit(null);
        }}
        placeId={isActuallyBusiness ? undefined : placeData?._id}
        businessId={isActuallyBusiness ? placeData?._id : undefined}
        isMapPurchased={isMapPurchased}
        initialData={
          selectedReviewForEdit
            ? {
                _id: selectedReviewForEdit._id,
                rating: selectedReviewForEdit.rating,
                review: selectedReviewForEdit.review,
              }
            : undefined
        }
      />

      {/* Media Modal */}
      <Dialog
        open={selectedMediaIndex !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMediaIndex(null);
            setZoom(1);
            setPosition({ x: 0, y: 0 });
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          overlayClassName="bg-black z-50"
          className="fixed inset-0 top-0 left-0 z-[100] flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-black p-0 shadow-none sm:max-w-none data-[state=open]:zoom-in-100 overflow-hidden"
        >
          {/* Blurred low-opacity background image or video */}
          {selectedMediaIndex !== null && (
            isVideo(mediaList[selectedMediaIndex]) ? (
              <video
                src={`${getImageUrl(mediaList[selectedMediaIndex])}#t=0.1`}
                className="absolute inset-0 h-full w-full object-cover blur-2xl opacity-20 pointer-events-none select-none"
                muted
                preload="auto"
                crossOrigin="anonymous"
              />
            ) : (
              <div
                className="absolute inset-0 bg-cover bg-center blur-2xl opacity-20 pointer-events-none select-none"
                style={{
                  backgroundImage: `url("${getImageUrl(mediaList[selectedMediaIndex])}")`,
                }}
              />
            )
          )}

          <DialogHeader className="sr-only">
            <DialogTitle>{t("place.photo_gallery")}</DialogTitle>
          </DialogHeader>

          <div
            className={`absolute top-0 inset-x-0 z-50 flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white backdrop-blur">
              {selectedMediaIndex !== null ? selectedMediaIndex + 1 : 0} /{" "}
              {mediaList.length}
            </span>

            <div className="flex items-center gap-2">
              {selectedMediaIndex !== null &&
                !isVideo(mediaList[selectedMediaIndex]) && (
                  <div className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 backdrop-blur">
                    <button
                      type="button"
                      onClick={handleZoomOut}
                      className="rounded-full p-2 text-white hover:bg-white/15 disabled:opacity-40"
                      disabled={zoom <= 0.5}
                      aria-label="Zoom out"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                      </svg>
                    </button>
                    <span className="min-w-10 text-center text-xs text-white">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={handleZoomIn}
                      className="rounded-full p-2 text-white hover:bg-white/15 disabled:opacity-40"
                      disabled={zoom >= 3}
                      aria-label="Zoom in"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="11" y1="8" x2="11" y2="14" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetZoom}
                      className="rounded-full p-2 text-white hover:bg-white/15"
                      aria-label="Reset zoom"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                      </svg>
                    </button>
                  </div>
                )}

              <button
                type="button"
                onClick={() => {
                  setSelectedMediaIndex(null);
                  setZoom(1);
                  setPosition({ x: 0, y: 0 });
                }}
                className="rounded-full bg-white/10 p-2.5 text-white backdrop-blur hover:bg-white/20"
                aria-label="Close gallery"
              >
                <X size={22} />
              </button>
            </div>
          </div>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 pb-6 pt-16"
            onWheel={handleWheel}
          >
            {selectedMediaIndex !== null && (
              <>
                <div
                  className="relative flex h-full w-full max-w-6xl items-center justify-center"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  style={{
                    cursor:
                      zoom > 1
                        ? isDragging
                          ? "grabbing"
                          : "grab"
                        : "default",
                  }}
                >
                  {isVideo(mediaList[selectedMediaIndex]) ? (
                    <video
                      ref={lightboxVideoRef}
                      key={selectedMediaIndex}
                      src={getImageUrl(mediaList[selectedMediaIndex])}
                      className="max-h-[min(85dvh,900px)] max-w-full object-contain rounded-lg shadow-2xl"
                      controls
                      autoPlay
                      preload="auto"
                      crossOrigin="anonymous"
                      playsInline
                    />
                  ) : (
                    <div
                      className="flex h-full w-full max-h-[min(85dvh,900px)] max-w-full items-center justify-center"
                      style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                        transition: isDragging
                          ? "none"
                          : "transform 0.12s ease-out",
                      }}
                    >
                      <LightboxImage
                        src={getImageUrl(mediaList[selectedMediaIndex])}
                        alt={`${placeData?.name || "Gallery"} photo ${selectedMediaIndex + 1}`}
                        className="h-auto w-auto max-h-[min(85dvh,900px)] max-w-full object-contain select-none"
                      />
                    </div>
                  )}
                </div>

                {mediaList.length > 1 && (
                  <div
                    className={`transition-opacity duration-300 ${
                      showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setZoom(1);
                        setPosition({ x: 0, y: 0 });
                        setSelectedMediaIndex(
                          (selectedMediaIndex - 1 + mediaList.length) %
                          mediaList.length,
                        );
                      }}
                      className="absolute left-2 md:left-6 top-1/2 z-[60] -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur hover:bg-black/70 md:p-3"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft size={36} strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setZoom(1);
                        setPosition({ x: 0, y: 0 });
                        setSelectedMediaIndex(
                          (selectedMediaIndex + 1) % mediaList.length,
                        );
                      }}
                      className="absolute right-2 md:right-6 top-1/2 z-[60] -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur hover:bg-black/70 md:p-3"
                      aria-label="Next photo"
                    >
                      <ChevronRight size={36} strokeWidth={1.5} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {mediaList.length > 1 && (
            <div
              className={`flex shrink-0 justify-center gap-2 overflow-x-auto px-4 pb-5 transition-transform duration-300 ${
                showControls ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
              }`}
            >
              {mediaList.map((media: string, index: number) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setPosition({ x: 0, y: 0 });
                    setSelectedMediaIndex(index);
                  }}
                  className={`relative h-14 w-16 shrink-0 overflow-hidden rounded-md border-2 ${selectedMediaIndex === index
                      ? "border-yellow-400"
                      : "border-white/20 opacity-70 hover:opacity-100"
                    }`}
                >
                  {isVideo(media) ? (
                    <div className="relative w-full h-full">
                      <video
                        src={`${getImageUrl(media)}#t=0.1`}
                        className="h-full w-full object-cover"
                        muted
                        preload="auto"
                        crossOrigin="anonymous"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                        <div className="bg-black/60 rounded-full p-1">
                          <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                      {selectedMediaIndex === index && (
                        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-yellow-400" />
                      )}
                    </div>
                  ) : (
                    <LightboxImage
                      src={getImageUrl(media)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MenuLightbox
        isOpen={menuLightboxOpen}
        onClose={() => setMenuLightboxOpen(false)}
        images={placeData?.menuImages || []}
        initialIndex={selectedMenuIndex}
        title={t("place.menu_and_prices") || "Menu"}
      />

      <AddToRouteModal
        isOpen={isAddToRouteModalOpen}
        onClose={() => setIsAddToRouteModalOpen(false)}
        location={placeData}
        type={isBusinessEntity ? "business" : "place"}
      />
    </section>
  );
}
