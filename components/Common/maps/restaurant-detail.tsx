"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatOfferDiscountLabel } from "@/lib/offer-label";
import { formatDate, getImageUrl } from "@/lib/utils";
import {
  useGetSingleOfferQuery,
  useRedeemOfferMutation,
} from "@/redux/features/offer/offerApi";
import { CheckCircle2, ChevronRight, HelpCircle, Lock, Star, Ticket } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppSelector } from "@/redux/hook";
import { selectCurrentUser } from "@/redux/features/auth/authSlice";
import { appAlert } from "@/lib/app-alert";
import { useLanguage } from "@/lib/i18n/LanguageContext";
 
export default function RestaurantDetail() {
  const { t } = useLanguage();
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const offerId = params.id as string;
  const user = useAppSelector(selectCurrentUser);
  const STORAGE_KEY = `offer_redeem_${offerId}_expiry`;
 
  const { data: offerRes, isLoading, error: offerError, refetch } = useGetSingleOfferQuery(offerId, {
    skip: !offerId,
  });
  const offer = offerRes?.data;
 
  const [redeemOffer, { isLoading: isRedeeming }] = useRedeemOfferMutation();
 
  // Only holds the running countdown — the idle number comes from the offer itself,
  // which is not loaded yet on first render
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [expiry, setExpiry] = useState<string | null>(null);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
 
  // Refetch the offer when component mounts and when user comes back
  useEffect(() => {
    if (offerId) {
      refetch();
    }
  }, [offerId, refetch]);
 
  useEffect(() => {
    // Check both localStorage and offer.activeRedemption
    const storedExpiry = localStorage.getItem(STORAGE_KEY);
    let activeExpiry = offer?.activeRedemption?.expiresAt;
 
    // If storedExpiry exists and is still valid, use it
    if (storedExpiry) {
      const now = new Date().getTime();
      const storedTime = new Date(storedExpiry).getTime();
      if (storedTime > now) {
        activeExpiry = storedExpiry;
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
 
    if (activeExpiry) {
      setExpiry(activeExpiry);
      localStorage.setItem(STORAGE_KEY, activeExpiry);
    }
  }, [offer, offerId, STORAGE_KEY]);
 
  useEffect(() => {
    if (!expiry) return;
 
    setIsTimerActive(true);
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(expiry).getTime() - now;
 
      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft(null);
        setIsTimerActive(false);
        setExpiry(null);
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      const totalSeconds = Math.max(0, Math.floor(distance / 1000));
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (hours > 0) {
        setTimeLeft(
          `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
        );
      } else {
        setTimeLeft(
          `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
        );
      }
    }, 1000);
 
    return () => clearInterval(timer);
  }, [expiry, STORAGE_KEY]);
 
  const handleRedeem = async () => {
    if (!user) {
      toast.error(t("login_required.title"));
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
 
    appAlert.fire({
      title: t("offer.confirm_redemption_title"),
      text: t("offer.confirm_redemption_text"),
      icon: "warning",
      timer: 5000,
      timerProgressBar: true,
      showCancelButton: true,
      confirmButtonText: t("offer.proceed_now"),
      cancelButtonText: t("common.cancel"),
    }).then(async (result) => {
      if (result.isConfirmed || result.dismiss === "timer") {
        try {
          const res = await redeemOffer(offerId).unwrap();
          if (res.data?.expiresAt) {
            toast.success(t("offer.offer_redeemed"));
            setExpiry(res.data.expiresAt);
            localStorage.setItem(STORAGE_KEY, res.data.expiresAt);
          }
          refetch();
        } catch (err: any) {
          toast.error(err?.data?.message || "Failed to redeem offer");
          // Someone else may have taken the last redemption — resync the state
          refetch();
        }
      }
    });
  };

  // Check if the current path is from /maps
  const isFromMaps = pathname?.startsWith("/maps");

  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-[#0b0f19] min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-96 w-full rounded-2xl" />
              <Skeleton className="h-20 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-80 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isLocked =
    (offerError as any)?.status === 403 ||
    (offerError as any)?.originalStatus === 403;

  if (isLocked) {
    const mapId =
      (offerError as any)?.data?.mapId ||
      null;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b0f19] p-4 text-gray-900 dark:text-slate-100">
        <div className="text-center space-y-6 max-w-md bg-white dark:bg-[#131b2e] p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-950/40 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t("offer.unlock_offer_title")}</h2>
          <p className="text-gray-600 dark:text-slate-400 leading-relaxed">
            {(offerError as any)?.data?.message ||
              t("offer.unlock_offer_desc")}
          </p>
          <Link href={mapId ? `/catalog/${mapId}` : "/catalog"}>
            <Button className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-6 rounded-xl cursor-pointer">
              <Ticket className="w-5 h-5 mr-2" />
              {t("offer.purchase_map")}
            </Button>
          </Link>
          <Link href="/offer">
            <Button variant="ghost" className="text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 w-full cursor-pointer">
              {t("offer.back_to_offers")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-slate-100">
        <p className="text-xl font-bold">{t("offer.offer_not_found")}</p>
      </div>
    );
  }

  const getOfferBadgeInfo = (off: any) => {
    const type = off?.discountType;
    if (type === "Percentage") {
      return { value: `${off?.discountValue ?? 0}%`, label: t("offer.discount") || "DISCOUNT" };
    }
    if (type === "Flat") {
      return { value: `$${off?.discountValue ?? 0}`, label: t("offer.discount") || "OFF" };
    }
    if (type === "Fixed Price") {
      return { value: `$${off?.discountValue ?? 0}`, label: "SPECIAL" };
    }
    if (type === "BOGO") {
      return { value: "BOGO", label: off?.bogoSecondType === "free" ? "BUY 1 GET 1" : "50% OFF 2ND" };
    }
    if (type === "Free item") {
      return { value: "FREE", label: "GIFT ITEM" };
    }
    return { value: "OFFER", label: t("offer.redeem_now") || "REDEEM NOW" };
  };

  const offerBadge = getOfferBadgeInfo(offer);

  const getFrequencyLabel = (off: any) => {
    const freq = off?.redemptionFrequency;
    const dur = off?.redemptionDuration;
    if (freq === "weekly" || dur === 10080) return t("offers_admin.freq_weekly") || "Weekly (Once per 7 days)";
    if (freq === "monthly" || dur === 43200) return t("offers_admin.freq_monthly") || "Monthly (Once per 30 days)";
    if (freq === "once" || dur >= 525600) return t("offers_admin.freq_once") || "One-Time Only";
    return t("offers_admin.freq_daily") || "Daily (Once per 24 hours)";
  };

  // maxRedemptions is per user; totalRedemptionLimit caps everyone together
  const redemptionsLeft =
    typeof offer.maxRedemptions === "number" && offer.maxRedemptions > 0
      ? Math.max(0, offer.maxRedemptions - (offer.userRedemptionCount || 0))
      : null;

  const soldOut =
    typeof offer.totalRedemptionLimit === "number" &&
    offer.totalRedemptionLimit > 0 &&
    (offer.redemptionsCount || 0) >= offer.totalRedemptionLimit;

  // Same checks the API runs on redeem — showing them upfront avoids a dead button
  const unavailable = (() => {
    if (isTimerActive) return null;

    const now = new Date();
    if (String(offer.status || "").toLowerCase() !== "active") {
      return {
        label: t("offer.offer_inactive"),
        message: t("offer.offer_inactive_msg"),
      };
    }
    if (!offer.noExpiration && offer.validFrom && now < new Date(offer.validFrom)) {
      return {
        label: t("offer.not_started"),
        message: `${t("offer.not_started_msg")} ${new Date(offer.validFrom).toLocaleDateString()}.`,
      };
    }
    if (!offer.noExpiration && offer.validUntil && now > new Date(offer.validUntil)) {
      return {
        label: t("offer.offer_expired_label"),
        message: t("offer.offer_expired_msg"),
      };
    }
    if (soldOut) {
      return {
        label: t("offer.fully_claimed"),
        message: t("offer.fully_claimed_msg"),
      };
    }
    if (redemptionsLeft === 0) {
      if (offer.isRecurring && offer.nextAvailableAt) {
        const nextDate = new Date(offer.nextAvailableAt);
        const isDaily =
          offer.redemptionFrequency === "daily" ||
          offer.redemptionDuration === 1440;
        const timeStr = !isNaN(nextDate.getTime())
          ? isDaily
            ? nextDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : `${nextDate.toLocaleDateString()} ${nextDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : "";
        return {
          label: isDaily ? (t("offer.used_today") || "USED TODAY") : (t("offer.already_used") || "ALREADY USED"),
          message: timeStr
            ? `${isDaily ? (t("offer.used_today_msg") || "You have used your daily discount today. It will be available again at") : "You have used this discount. It will be available again on"} ${timeStr}.`
            : (t("offer.used_today") || "USED TODAY"),
        };
      }

      return {
        label: t("offer.already_used"),
        message:
          offer.maxRedemptions === 1
            ? t("offer.already_used_msg")
            : t("offer.all_redemptions_used"),
      };
    }
    return null;
  })();

  const redemptionRules =
    offer.redemptionRules && offer.redemptionRules.length > 0
      ? offer.redemptionRules
      : [
          "One redemption per user",
          "Valid for all days",
          "Cannot combine with other promotions",
        ];

  return (
    <div className="bg-gray-50 dark:bg-[#0b0f19] py-4 sm:py-6 md:py-8 pb-10 sm:pb-12 md:pb-14 min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Breadcrumb */}
        {!isFromMaps && (
          <div className="mb-4 sm:mb-5 md:mb-6">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Link
                href="/offer"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                {t("nav.offer")}
              </Link>
              <span className="text-gray-400 dark:text-slate-600">/</span>
              <span className="text-gray-700 dark:text-slate-200 font-medium line-clamp-1">
                {offer?.title}
              </span>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="">
          {/* Desktop View */}
          <div className="hidden md:grid lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {/* Left Section - Image and Details */}
            <div className="bg-white dark:bg-[#131b2e]/90 border border-transparent dark:border-slate-800/80 backdrop-blur-md lg:col-span-2 space-y-4 sm:space-y-5 md:space-y-6 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm">
              {/* Hero Image with Rating */}
              <div className="relative rounded-t-xl sm:rounded-t-2xl overflow-hidden h-48 sm:h-64 md:h-80 lg:h-96 bg-gray-200 dark:bg-slate-800">
                <Image
                  src={getImageUrl(offer.photo)}
                  alt={offer?.title}
                  width={500}
                  height={500}
                  unoptimized
                  className="w-full h-full object-cover object-center"
                  referrerPolicy="no-referrer"
                />

                {/* Rating Badge */}
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-white/95 dark:bg-[#0b0f19]/90 backdrop-blur-md rounded-full px-2 py-1.5 sm:px-3 sm:py-2 flex items-center gap-1 shadow-md border border-white/20 dark:border-slate-800">
                  <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {offer?.place?.rating || 0} (
                    {offer?.place?.totalReview || 0} {t("place.reviews")})
                  </span>
                </div>
              </div>

              <div className="space-y-4 sm:space-y-5 md:space-y-6 p-4 sm:p-5 md:p-6 pt-2 sm:pt-2 md:pt-2">
                {/* Restaurant Name and Discount */}
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="space-y-1 sm:space-y-2">
                      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-slate-100 wrap-break-word">
                        {offer?.title}
                      </h1>
                      <p className="text-sm sm:text-base text-gray-600 dark:text-slate-400 flex items-center gap-2 wrap-break-word">
                        <span>📍</span>{" "}
                        {offer.place?.address || t("offer.location_not_specified")}
                      </p>
                    </div>
                    <div className="bg-[#fabf13] text-black font-bold px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-full text-base sm:text-lg md:text-xl inline-block w-fit shadow-md shadow-amber-500/20">
                      {formatOfferDiscountLabel(offer)}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="">
                  <p className="text-sm sm:text-base text-gray-700 dark:text-slate-300 leading-relaxed">
                    {offer.description}
                  </p>
                  {/* Collapsible Information Section */}
                  <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0e1424] shadow-sm mt-6">
                    <button
                      type="button"
                      onClick={() => setIsInfoExpanded(!isInfoExpanded)}
                      className="w-full flex items-center justify-between p-4 sm:p-5 bg-gray-50 hover:bg-gray-100 dark:bg-[#131b2e] dark:hover:bg-slate-800/60 transition-colors font-bold text-gray-900 dark:text-slate-100 border-none cursor-pointer outline-none"
                    >
                      <span>{t("offer.information")}</span>
                      <span
                        className="text-gray-500 dark:text-slate-400 transition-transform duration-200"
                        style={{ transform: isInfoExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                      >
                        ▶
                      </span>
                    </button>
                    <div
                      className="transition-all duration-200 overflow-hidden"
                      style={{
                        maxHeight: isInfoExpanded ? "1000px" : "0px",
                        borderTop: isInfoExpanded ? "1px solid #e5e7eb" : "none",
                      }}
                    >
                      <div className="grid sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6 p-4 sm:p-5 md:p-6 bg-gray-50/50 dark:bg-[#0e1424]/60">
                        {/* Validity Period */}
                        <div className="space-y-3 sm:space-y-4">
                          <h3 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">
                            {t("offer.validity_period")}
                          </h3>
                          <div className="space-y-2 sm:space-y-3">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="text-xl sm:text-2xl">📅</div>
                              <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 uppercase">
                                  {t("offer.from")}
                                </p>
                                <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 wrap-break-word">
                                  {formatDate(offer.createdAt)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="text-xl sm:text-2xl">📅</div>
                              <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 uppercase">
                                  {t("offer.until")}
                                </p>
                                <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-slate-100 wrap-break-word">
                                  {offer.noExpiration || !offer.validUntil
                                    ? t("offer.no_expiration")
                                    : new Date(offer.validUntil).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Redemption Rules */}
                        <div className="mt-3 sm:mt-0">
                          <h3 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-3 sm:mb-4">
                            {t("offer.redemption_rules")}
                          </h3>
                          <div className="space-y-2 sm:space-y-3">
                            {redemptionRules.map((rule: string, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 sm:gap-3"
                              >
                                <CheckCircle2 className="size-5 text-yellow-500" />
                                <p className="text-sm sm:text-base text-gray-700 dark:text-slate-300">
                                  {rule}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - Redemption Status */}
            <div className="lg:col-span-1 space-y-4 sm:space-y-5 md:space-y-6">
              <div className="bg-white dark:bg-[#131b2e]/90 rounded-xl sm:rounded-2xl border border-gray-200/50 dark:border-slate-800/80 shadow-md backdrop-blur-md p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5 md:space-y-6">
                {/* Redemption Status Header */}
                <div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4 sm:mb-5 md:mb-6">
                    {t("offer.redemption_status")}
                  </h2>

                  {/* Timer Circle */}
                  <div className="flex justify-center mb-4 sm:mb-5 md:mb-6">
                    <div
                      className={`w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full border-4 sm:border-6 md:border-8 flex items-center justify-center bg-gray-50 dark:bg-[#0b0f19] ${
                        unavailable ? "border-gray-300 dark:border-slate-700" : "border-yellow-400"
                      }`}
                    >
                      <div className="text-center px-2">
                        {unavailable ? (
                          <>
                            <Lock className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400 mx-auto mb-1" />
                            <div className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                              {unavailable.label}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-slate-100">
                              {isTimerActive ? timeLeft : offerBadge.value}
                            </div>
                            <div className="text-[10px] sm:text-xs md:text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                              {isTimerActive ? t("offer.time_left") : offerBadge.label}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Frequency Badge */}
                  <div className="flex justify-center -mt-1 mb-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 shadow-xs">
                      🔄 {getFrequencyLabel(offer)}
                    </span>
                  </div>

                  {/* Instructions */}
                  <div
                    className={`p-3 sm:p-4 rounded-lg text-center ${
                      unavailable ? "bg-gray-100 dark:bg-slate-800/60" : "bg-gray-50 dark:bg-[#0e1424] dark:border dark:border-slate-800/60"
                    }`}
                  >
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300">
                      {unavailable ? (
                        unavailable.message
                      ) : offer.place?.name ? (
                        <>
                          {t("offer.present_instruction_prefix")}{" "}
                          <span className="font-semibold wrap-break-word text-gray-900 dark:text-slate-100">
                            {offer.place?.name}
                          </span>{" "}
                          {t("offer.present_instruction_suffix")}
                        </>
                      ) : (
                        t("offer.present_instruction")
                      )}
                    </p>
                  </div>

                  {redemptionsLeft !== null && !unavailable && (
                    <p className="mt-2 text-center text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">
                      {redemptionsLeft} / {offer.maxRedemptions} {t("offer.redemptions_left")}
                    </p>
                  )}
                </div>

                {/* Redeem Button */}
                <Button
                  onClick={handleRedeem}
                  disabled={isRedeeming || isTimerActive || Boolean(unavailable)}
                  className="w-full bg-[#FFC107] hover:bg-[#FFB300] text-black font-bold rounded-lg px-6 sm:px-8 md:px-10 h-11 sm:h-12 md:h-14 text-sm sm:text-base shadow-lg shadow-yellow-500/20 disabled:bg-gray-200 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-slate-500 disabled:shadow-none cursor-pointer"
                >
                  {isRedeeming
                    ? t("offer.redeeming")
                    : isTimerActive
                      ? t("offer.offer_redeemed")
                      : unavailable
                        ? unavailable.label
                        : t("offer.redeem")}
                </Button>

                {/* Offer Code */}
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <code className="text-xs sm:text-sm break-all text-center text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-[#0e1424] px-2 py-1 rounded">
                    {offer.offerCode}
                  </code>
                </div>

                {/* Help Section */}
                <Link href="/contact" className="block">
                  <div className="border rounded-lg bg-gray-100/50 hover:bg-gray-100 dark:bg-[#0e1424] dark:hover:bg-slate-800/50 border-gray-200 dark:border-slate-800 p-3 sm:p-4 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-slate-400" />
                          <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-slate-100">
                            {t("offer.need_help")}
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 px-6 sm:px-7">
                          {t("offer.contact_support")}
                        </p>
                      </div>
                      <div className="">
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-slate-500" />
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Mobile View */}
          <div className="block md:hidden space-y-4 px-1 pb-4">
            <div className="bg-white dark:bg-[#131b2e]/90 rounded-3xl p-4 sm:p-5 border border-gray-100 dark:border-slate-800/80 shadow-xl shadow-gray-200/40 dark:shadow-black/40 space-y-4 backdrop-blur-md">
              {/* Restaurant/Business Header */}
              <div className="text-center">
                <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                  {offer.place?.name || "Premium Spot"}
                </span>
              </div>

              {/* Offer Photo with Discount Badge Overlay */}
              <div className="relative w-full h-52 sm:h-60 rounded-2xl overflow-hidden bg-gray-200 dark:bg-slate-800 shadow-md">
                <Image
                  src={getImageUrl(offer.photo)}
                  alt={offer?.title}
                  width={400}
                  height={300}
                  unoptimized
                  className="w-full h-full object-cover object-center"
                  referrerPolicy="no-referrer"
                />
                {/* Bottom gradient overlay to make text/badges pop */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                {/* Discount Badge bottom right */}
                <div className="absolute bottom-3 right-3 bg-red-500 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs shadow-lg shadow-red-500/30 uppercase tracking-wider border border-red-400/20">
                  {formatOfferDiscountLabel(offer)}
                </div>
                {/* Rating Badge top right */}
                <div className="absolute top-3 right-3 bg-white/80 dark:bg-[#0b0f19]/80 backdrop-blur-md rounded-xl px-2.5 py-1.5 flex items-center gap-1 shadow-md border border-white/40 dark:border-slate-800">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-bold text-gray-900 dark:text-slate-100">
                    {offer?.place?.rating || 0}
                  </span>
                </div>
              </div>

              {/* Location Name or Title */}
              <div className="text-center px-2 space-y-1">
                <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-slate-100 leading-snug tracking-tight">
                  {offer?.title}
                </h1>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium flex items-center justify-center gap-1">
                  <span>📍</span> {offer.place?.address || t("offer.location_not_specified")}
                </p>
              </div>

              {/* Expandable Offer Info */}
              <div className="border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-[#0e1424] shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsInfoExpanded(!isInfoExpanded)}
                  className="w-full flex items-center justify-between p-3.5 bg-gray-50/50 hover:bg-gray-50 dark:bg-[#131b2e] dark:hover:bg-slate-800/60 active:scale-[0.99] transition-all font-bold text-xs text-gray-700 dark:text-slate-200 border-none cursor-pointer outline-none uppercase tracking-wider"
                >
                  <span>{t("offer.offer_information")}</span>
                  <ChevronRight
                    className="w-4 h-4 text-gray-400 dark:text-slate-500 transition-transform duration-200"
                    style={{ transform: isInfoExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                  />
                </button>
                <div
                  className="transition-all duration-200 overflow-hidden"
                  style={{
                    maxHeight: isInfoExpanded ? "1000px" : "0px",
                    borderTop: isInfoExpanded ? "1px solid #f3f4f6" : "none",
                  }}
                >
                  <div className="p-4 space-y-4 bg-gray-50/30 dark:bg-[#0e1424]/60 text-sm">
                    {/* Description */}
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                        {t("place.description")}
                      </h4>
                      <p className="text-gray-700 dark:text-slate-300 leading-relaxed text-xs">
                        {offer.description}
                      </p>
                    </div>

                    {/* Validity Period */}
                    <div className="space-y-2 border-t pt-3 border-gray-200/60 dark:border-slate-800">
                      <h4 className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                        {t("offer.validity_period")}
                      </h4>
                      <div className="flex justify-between text-xs text-gray-600 dark:text-slate-400">
                        <div>
                          <span className="font-semibold block text-[9px] text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                            {t("offer.from")}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-slate-200">{formatDate(offer.createdAt)}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold block text-[9px] text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                            {t("offer.until")}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-slate-200">
                            {offer.noExpiration || !offer.validUntil
                              ? t("offer.no_expiration")
                              : new Date(offer.validUntil).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Rules */}
                    <div className="space-y-2 border-t pt-3 border-gray-200/60 dark:border-slate-800">
                      <h4 className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                        {t("offer.redemption_rules")}
                      </h4>
                      <div className="space-y-1.5">
                        {redemptionRules.map((rule: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="size-4 text-yellow-500 shrink-0 mt-0.5" />
                            <span className="text-xs text-gray-600 dark:text-slate-300">{rule}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timer and Redeem Button Block */}
              <div className="bg-gray-50/50 dark:bg-[#0e1424] rounded-2xl border border-gray-100 dark:border-slate-800/80 p-4 flex flex-col items-center space-y-4">
                {/* Timer Circle */}
                <div
                  className={`w-24 h-24 rounded-full border-4 flex items-center justify-center bg-white dark:bg-[#0b0f19] shadow-sm transition-all duration-300 ${
                    unavailable ? "border-gray-200 dark:border-slate-700" : "border-yellow-400 animate-pulse-subtle"
                  }`}
                >
                  <div className="text-center px-1">
                    {unavailable ? (
                      <>
                        <Lock className="w-5 h-5 text-gray-400 mx-auto mb-0.5" />
                        <div className="text-[9px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wide">
                          {unavailable.label}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-xl font-black text-gray-900 dark:text-slate-100 leading-none tracking-tight">
                          {isTimerActive ? timeLeft : offerBadge.value}
                        </div>
                        <div className="text-[8px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                          {isTimerActive ? t("offer.time_left") : offerBadge.label}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Frequency Badge */}
                <div className="flex justify-center -mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                    🔄 {getFrequencyLabel(offer)}
                  </span>
                </div>

                {/* Message / Instruction */}
                <p className="text-xs text-gray-500 dark:text-slate-400 text-center px-2 leading-relaxed">
                  {unavailable ? (
                    unavailable.message
                  ) : offer.place?.name ? (
                    <>
                      {t("offer.present_instruction_prefix")}{" "}
                      <span className="font-bold text-gray-700 dark:text-slate-200">{offer.place?.name}</span> {t("offer.present_instruction_suffix")}
                    </>
                  ) : (
                    t("offer.present_instruction")
                  )}
                </p>

                {redemptionsLeft !== null && !unavailable && (
                  <p className="text-[10px] font-medium text-gray-400 dark:text-slate-500 -mt-2">
                    {redemptionsLeft} / {offer.maxRedemptions} {t("offer.redemptions_left")}
                  </p>
                )}

                {/* Redeem Button */}
                <Button
                  onClick={handleRedeem}
                  disabled={isRedeeming || isTimerActive || Boolean(unavailable)}
                  className="w-full bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-black font-extrabold rounded-2xl h-13 text-xs uppercase tracking-widest shadow-lg shadow-yellow-400/20 active:scale-[0.98] transition-all duration-150 disabled:bg-gray-200 dark:disabled:bg-slate-800 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 dark:disabled:text-slate-500 disabled:shadow-none cursor-pointer"
                >
                  {isRedeeming
                    ? t("offer.redeeming")
                    : isTimerActive
                      ? t("offer.offer_redeemed")
                      : unavailable
                        ? unavailable.label
                        : t("offer.redeem")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
