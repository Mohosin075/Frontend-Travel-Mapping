"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getLocalized } from "@/lib/utils";
import { useAppSelector } from "@/redux/hook";
import { selectAccessToken } from "@/redux/features/auth/authSlice";
import { useGetProfileQuery } from "@/redux/features/user/userApi";
import { useGetAwardsQuery, useRedeemFreeMapMutation } from "@/redux/features/award/awardApi";
import { useCreateMapCheckoutSessionMutation } from "@/redux/features/payment/paymentApi";

type PurchaseMap = { _id: string; name?: unknown; isPaid?: boolean };
type PurchaseOptions = { redeemFreeIntent?: boolean; loginRedirect?: string };
type OwnedMap = string | { _id?: string; id?: string } | null;
type FreeMapAward = { type: string; isUnlocked: boolean; config?: { mapCount?: number } };

export function useMapPurchase() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const accessToken = useAppSelector(selectAccessToken);
  const { data: profile, isFetching: profileLoading } = useGetProfileQuery({}, { skip: !accessToken });
  const { data: awards, isLoading: awardsLoading } = useGetAwardsQuery({ page: 1, limit: 50 }, { skip: !accessToken });
  const [createCheckout, checkoutState] = useCreateMapCheckoutSessionMutation();
  const [redeemFreeMap, redeemState] = useRedeemFreeMapMutation();
  const [pendingMapId, setPendingMapId] = useState<string | null>(null);
  const inFlight = useRef(false);
  const dataLoading = Boolean(accessToken && (profileLoading || awardsLoading));
  const redeemedCount = profile?.redeemedFreeMaps?.length || (profile?.redeemedFreeMap ? 1 : 0);
  const freeMapAllowance = (awards?.data || [])
    .filter((award: FreeMapAward) => award.type === "Free Map" && award.isUnlocked)
    .reduce((total: number, award: FreeMapAward) => total + (Number(award.config?.mapCount) || 1), 0);

  const hasAccess = (map: PurchaseMap) => map.isPaid === false || Boolean(accessToken &&
    profile?.purchasedMaps?.some((item: OwnedMap) => {
      const id = typeof item === "object" ? item?._id || item?.id : item;
      return String(id) === String(map._id);
    }));
  const canClaimFreeMap = (map: PurchaseMap) => Boolean(accessToken && !dataLoading && profile && map.isPaid && freeMapAllowance > redeemedCount);

  const openMap = (map: PurchaseMap) => {
    localStorage.setItem("selectedMapId", String(map._id));
    const name = getLocalized(map.name, language);
    if (name) localStorage.setItem("selectedCountryFilter", name);
    router.push("/maps");
  };

  const buyMap = async (map: PurchaseMap, options: PurchaseOptions = {}) => {
    if (!map._id || inFlight.current) return;
    if (hasAccess(map)) { openMap(map); return; }
    if (!accessToken) {
      const redirect = options.redeemFreeIntent
        ? options.loginRedirect || `/catalog/${map._id}?redeemFreeMap=1`
        : `/catalog/checkout?mapId=${encodeURIComponent(map._id)}&resume=1`;
      router.push(`/register?redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    if (dataLoading || !profile) {
      toast.error("Please wait for your purchase options to load, then try again.");
      return;
    }
    const claimFree = canClaimFreeMap(map);
    if (options.redeemFreeIntent && !claimFree) {
      toast.error(t(redeemedCount > 0 ? "maps.already_redeemed_free" : "maps.unlock_free_first"));
      return;
    }

    inFlight.current = true;
    setPendingMapId(map._id);
    try {
      if (claimFree) {
        await redeemFreeMap({ mapId: map._id }).unwrap();
        toast.success(t("maps.free_map_claimed"));
        openMap(map);
        return;
      }
      const response = await createCheckout({
        mapId: map._id,
        successUrl: `${window.location.origin}?session_id={CHECKOUT_SESSION_ID}&success=true&open_map=1`,
        cancelUrl: `${window.location.origin}/payment-failed?success=false`,
      }).unwrap();
      if (response?.data?.url) window.location.href = response.data.url;
      else toast.error(t("payment.checkout_url_failed"));
    } catch (error: unknown) {
      const message = (error as { data?: { message?: string } })?.data?.message;
      toast.error(message || (claimFree ? "Failed to claim free map." : "Something went wrong during checkout."));
    } finally {
      inFlight.current = false;
      setPendingMapId(null);
    }
  };

  return { buyMap, openMap, hasAccess, canClaimFreeMap, pendingMapId,
    isBusy: dataLoading || Boolean(pendingMapId) || checkoutState.isLoading || redeemState.isLoading };
}
