"use client";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { getImageUrl, getLocalized } from "@/lib/utils";
import { useGetMapByIdQuery } from "@/redux/features/map/mapApi";
import { trackUsage } from "@/lib/record-visit";
import { useCreateMapCheckoutSessionMutation } from "@/redux/features/payment/paymentApi";
import { useGetProfileQuery } from "@/redux/features/user/userApi";
import {
  useGetAwardsQuery,
  useRedeemFreeMapMutation,
} from "@/redux/features/award/awardApi";
import { useAppSelector } from "@/redux/hook";
import { selectAccessToken } from "@/redux/features/auth/authSlice";
import { Check } from "lucide-react";
import Link from "next/link";
import { useLoginRequired } from "@/components/shared/login-required-modal";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function FeatureMapDetailPage() {
  const { t, language } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openLoginRequired } = useLoginRequired();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const redeemFreeIntent = searchParams.get("redeemFreeMap") === "1";

  const {
    data: response,
    isLoading,
    isError,
  } = useGetMapByIdQuery(id as string, { skip: !id });
  const accessToken = useAppSelector(selectAccessToken);
  const mapData = response?.data;
  useEffect(() => {
    if (!id) return;
    trackUsage("map", String(id));
  }, [id, accessToken]);


  const { data: userProfile, isLoading: isProfileLoading } = useGetProfileQuery({}, { skip: !accessToken });
  const { data: awardsRes } = useGetAwardsQuery(
    { page: 1, limit: 50 },
    { skip: !accessToken },
  );
  const purchasedMaps = userProfile?.purchasedMaps || [];

  const isPurchased = purchasedMaps.some((m: any) => {
    const mapId = typeof m === "object" ? m._id || m.id : m;
    return String(mapId) === String(id);
  });

  const hasAccess = mapData?.isPaid === false || isPurchased;

  const canClaimFreeMap = useMemo(() => {
    if (!accessToken || isProfileLoading || !userProfile || !mapData?.isPaid) {
      return false;
    }
    const awards = awardsRes?.data || [];
    const totalAllowed = awards
      .filter((a: any) => a.type === "Free Map" && a.isUnlocked)
      .reduce((acc: number, a: any) => acc + (Number(a.config?.mapCount) || 1), 0);

    const redeemedCount = Array.isArray(userProfile?.redeemedFreeMaps) && userProfile.redeemedFreeMaps.length > 0
      ? userProfile.redeemedFreeMaps.length
      : (userProfile?.redeemedFreeMap ? 1 : 0);

    return totalAllowed > redeemedCount;
  }, [accessToken, isProfileLoading, userProfile, mapData?.isPaid, awardsRes?.data]);

  const handleViewMap = () => {
    if (mapData?.name) {
      localStorage.setItem("selectedCountryFilter", mapData.name);
    }
    router.push("/maps");
  };

  const [createCheckout, { isLoading: isCheckingOut }] =
    useCreateMapCheckoutSessionMutation();
  const [redeemFreeMap, { isLoading: isRedeemingFree }] =
    useRedeemFreeMapMutation();
  const [mainImage, setMainImage] = useState<string | null>(null);

  const handleClaimFreeMap = async () => {
    if (!accessToken) {
      openLoginRequired(window.location.pathname + window.location.search);
      return;
    }
    try {
      await redeemFreeMap({ mapId: String(id) }).unwrap();
      toast.success(t("maps.free_map_claimed"));
      if (mapData?.name) {
        localStorage.setItem("selectedCountryFilter", mapData.name);
      }
      router.push("/maps");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to claim free map.");
    }
  };

  const handleBuyNow = async () => {
    if (!accessToken) {
      openLoginRequired(window.location.pathname + window.location.search);
      return;
    }

    // Prefer free redeem when Free Map award is unlocked
    if (canClaimFreeMap) {
      await handleClaimFreeMap();
      return;
    }

    if (redeemFreeIntent) {
      const redeemedCount = Array.isArray(userProfile?.redeemedFreeMaps) && userProfile.redeemedFreeMaps.length > 0
        ? userProfile.redeemedFreeMaps.length
        : (userProfile?.redeemedFreeMap ? 1 : 0);
      if (redeemedCount > 0) {
        toast.error(t("maps.already_redeemed_free"));
      } else {
        toast.error(t("maps.unlock_free_first"));
      }
      return;
    }

    try {
      // Amount is resolved server-side from Map.price
      const res = await createCheckout({
        mapId: id,
        successUrl: `${window.location.origin}?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancelUrl: `${window.location.origin}/payment-failed?success=false`,
      }).unwrap();

      if (res?.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error(t("payment.checkout_url_failed"));
      }
    } catch (error: any) {
      toast.error(
        error?.data?.message || "Something went wrong during checkout.",
      );
    }
  };

  useEffect(() => {
    if (mapData?.images?.length > 0) {
      setMainImage(getImageUrl(mapData.images[0]));
    }
  }, [mapData]);

  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-[#0b0f19] min-h-screen py-8">
        <div className="max-w-360 mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Skeleton className="h-96 w-full rounded-2xl dark:bg-slate-800" />
            <div className="space-y-6">
              <Skeleton className="h-10 w-3/4 dark:bg-slate-800" />
              <Skeleton className="h-6 w-1/4 dark:bg-slate-800" />
              <Skeleton className="h-32 w-full dark:bg-slate-800" />
              <Skeleton className="h-12 w-full dark:bg-slate-800" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !mapData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b0f19]">
        <div className="text-center p-8 bg-white dark:bg-[#131b2e] rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xl max-w-md mx-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">
            {t("map.map_not_found")}
          </h2>
          <Button asChild className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold">
            <Link href="/maps">{t("place.back_to_maps")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-[#0b0f19] min-h-screen py-8">
      <div className="max-w-360 mx-auto px-4 md:px-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400 mb-8">
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
            {t("map.home")}
          </Link>
          <span>/</span>
          <Link href="/maps" className="text-blue-600 dark:text-blue-400 hover:underline">
            {t("map.regional_maps")}
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-slate-200 font-semibold">{getLocalized(mapData.name, language)}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Side - Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="bg-gray-200 dark:bg-slate-900 rounded-2xl overflow-hidden aspect-square flex items-center justify-center border border-transparent dark:border-slate-800 shadow-sm">
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={getLocalized(mapData.name, language)}
                  className="w-full h-full object-cover transition-opacity duration-300"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-gray-400 dark:text-slate-500">{t("map.no_image_available")}</div>
              )}
            </div>

            {/* Carousel Thumbnails */}
            {mapData.images?.length > 1 && (
              <div className="w-full px-0">
                <Carousel className="w-full">
                  <CarouselContent>
                    {mapData.images.map((img: string, idx: number) => {
                      const thumbUrl = getImageUrl(img);
                      return (
                        <CarouselItem key={idx} className="basis-1/4">
                          <div
                            onClick={() => setMainImage(thumbUrl)}
                            className={`h-24 rounded-lg overflow-hidden cursor-pointer border-2 transition-all hover:border-yellow-400 dark:bg-slate-900 ${
                              mainImage === thumbUrl
                                ? "border-yellow-400 dark:border-yellow-400"
                                : "border-gray-200 dark:border-slate-800"
                            }`}
                          >
                            <img
                              src={thumbUrl}
                              alt={`Thumbnail ${idx + 1}`}
                              className="w-full h-full object-cover hover:scale-105 transition-transform"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                </Carousel>
              </div>
            )}
          </div>

          {/* Right Side - Details */}
          <div className="space-y-6">
            {/* Collection Label */}
            <div>
              <span className="inline-block text-yellow-500 dark:text-amber-400 font-bold text-sm tracking-wide mb-2 uppercase">
                {t("map.most_popular_collection")}
              </span>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-4">
                {getLocalized(mapData.name, language)}
              </h1>

              {/* Price */}
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-yellow-500 dark:text-amber-400">
                  ${mapData.price}
                </span>
              </div>
            </div>

            {/* Buy / View Button */}
            {hasAccess ? (
              <Button
                onClick={handleViewMap}
                className="w-full text-black py-6 px-13.5 text-lg bg-yellow-400 hover:bg-yellow-500 font-bold rounded-lg transition-colors shadow-lg shadow-yellow-500/20 cursor-pointer border-none"
              >
                {t("map.already_purchased_view")}
              </Button>
            ) : (
              <Button
                onClick={canClaimFreeMap ? handleClaimFreeMap : handleBuyNow}
                disabled={isCheckingOut || isRedeemingFree}
                className="w-full text-black py-6 px-13.5 text-lg bg-yellow-400 hover:bg-yellow-500 font-bold rounded-lg transition-colors shadow-lg shadow-yellow-500/20 cursor-pointer border-none disabled:opacity-70"
              >
                {isCheckingOut || isRedeemingFree
                  ? t("common.loading")
                  : canClaimFreeMap
                    ? t("map.claim_free_map")
                    : t("map.buy_now")}
              </Button>
            )}

            {/* Description Section */}
            <div className="space-y-3 bg-white dark:bg-[#131b2e]/90 p-6 rounded-2xl border border-gray-100 dark:border-slate-800/80 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 underline decoration-yellow-400 decoration-2 underline-offset-4">
                {t("map.map_description")}
              </h3>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed" style={{ whiteSpace: "pre-line" }}>
                {getLocalized(mapData.description, language)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
