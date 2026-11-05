"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/redux/hook";
import { selectAccessToken, logout } from "@/redux/features/auth/authSlice";
import { useGetProfileQuery } from "@/redux/features/user/userApi";
import {
  useVerifyPromoCodeQuery,
  useClaimFreePromoMutation,
  useCreatePromoCheckoutSessionMutation,
} from "@/redux/features/promo/promoApi";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "motion/react";
import {
  Ticket,
  AlertCircle,
  Loader2,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Star,
  Sparkles,
  MapPin,
  Trophy,
  Route,
  RefreshCw,
  MailCheck,
  UserPlus,
  LogIn,
  LogOut,
} from "lucide-react";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getLocalized } from "@/lib/utils";

function ClaimPromoContent() {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const code = searchParams.get("code") || "";
  const success = searchParams.get("success") === "true";
  const cancelled = searchParams.get("cancelled") === "true";

  const accessToken = useAppSelector(selectAccessToken);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClaimedSuccess, setIsClaimedSuccess] = useState(false);
  const [showMismatchModal, setShowMismatchModal] = useState(false);
  const [mismatchMessage, setMismatchMessage] = useState("");

  // RTK Query calls
  const { data: userProfile } = useGetProfileQuery({}, { skip: !accessToken });
  const {
    data: verifyRes,
    isLoading: isLoadingVerify,
    isError: isErrorVerify,
    error: verifyError,
    refetch: refetchVerification,
  } = useVerifyPromoCodeQuery(
    { code },
    { skip: !code || success }
  );

  const [claimFreePromo] = useClaimFreePromoMutation();
  const [createPromoCheckoutSession] = useCreatePromoCheckoutSessionMutation();

  const promoData = verifyRes?.data;
  const promoPrice = typeof promoData?.price === "number" ? promoData.price : Number(promoData?.price || 0);
  const isFree = promoData ? promoPrice === 0 : false;
  const rawMapName = typeof promoData?.mapId === "object" ? promoData?.mapId?.name : promoData?.mapName;
  const mapName =
    getLocalized(rawMapName, language) ||
    getLocalized(promoData?.mapName, language) ||
    (typeof rawMapName === "string" ? rawMapName : "") ||
    "Selected Map";
  const promoType = promoData?.promoType || (isFree ? "influencer" : "upgrade");

  // Validate if logged-in user already owns this map safely (null-safe check)
  const purchasedMaps = Array.isArray(userProfile?.purchasedMaps) ? userProfile.purchasedMaps : [];
  const promoMapId = typeof promoData?.mapId === "object" ? promoData?.mapId?._id : promoData?.mapId;
  const alreadyOwnsMap =
    Boolean(promoMapId) &&
    purchasedMaps.some((m: any) => {
      if (!m) return false;
      const mId = typeof m === "object" && m !== null ? m._id : m;
      return String(mId) === String(promoMapId);
    });

  // Verify if email matches target email warning safely
  const userEmailStr = typeof userProfile?.email === "string" ? userProfile.email.toLowerCase() : "";
  const recipientEmailStr = typeof promoData?.recipientEmail === "string" ? promoData.recipientEmail.toLowerCase() : "";
  const emailMismatch =
    Boolean(accessToken) &&
    Boolean(recipientEmailStr) &&
    Boolean(userEmailStr) &&
    userEmailStr !== recipientEmailStr;

  // Auto claim free invitation immediately after user signs in / registers
  const hasAutoClaimedRef = React.useRef(false);

  useEffect(() => {
    if (accessToken && code && !success) {
      refetchVerification();
    }
  }, [accessToken, code, success, refetchVerification]);

  useEffect(() => {
    // Only auto-claim if user is authenticated, has a valid code, promo is loaded and free
    if (!accessToken || !code || success || isClaimedSuccess || alreadyOwnsMap) return;
    if (isLoadingVerify || !promoData) return;
    if (promoData.recipientEmail && !userProfile) return;
    if (!isFree) return;
    if (emailMismatch) return;

    if (!hasAutoClaimedRef.current && !isProcessing) {
      hasAutoClaimedRef.current = true;
      handleFreeClaim();
    }
  }, [
    accessToken,
    code,
    success,
    isClaimedSuccess,
    alreadyOwnsMap,
    isLoadingVerify,
    promoData,
    userProfile,
    isFree,
    emailMismatch,
    isProcessing,
  ]);

  // Handle Free Claiming
  const handleFreeClaim = async () => {
    if (!accessToken) {
      const redirectUrl = `/login?redirect=${encodeURIComponent(`/claim-promo?code=${code}`)}`;
      router.push(redirectUrl);
      return;
    }

    if (emailMismatch) {
      const msg = `This invitation is specifically reserved for ${promoData?.recipientEmail}. You are logged in as ${userProfile?.email}.`;
      setMismatchMessage(msg);
      setShowMismatchModal(true);
      return;
    }

    setIsProcessing(true);
    try {
      const res = await claimFreePromo({ code }).unwrap();
      setIsClaimedSuccess(true);
      toast.success(res?.message || "Invitation claimed successfully!");
      setTimeout(() => {
        handleGoToMap();
      }, 2000);
    } catch (error: any) {
      const errMsg = error?.data?.message || error?.message || "";
      if (errMsg.includes("specifically reserved for")) {
        setMismatchMessage(errMsg);
        setShowMismatchModal(true);
      } else {
        toast.error(errMsg || "Failed to redeem pass");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Paid Upgrade Stripe Checkout redirection
  const handlePaidCheckout = async () => {
    if (!accessToken) {
      const redirectUrl = `/login?redirect=${encodeURIComponent(`/claim-promo?code=${code}`)}`;
      router.push(redirectUrl);
      return;
    }

    if (emailMismatch) {
      const msg = `This invitation is specifically reserved for ${promoData?.recipientEmail}. You are logged in as ${userProfile?.email}.`;
      setMismatchMessage(msg);
      setShowMismatchModal(true);
      return;
    }

    setIsProcessing(true);
    try {
      const result = await createPromoCheckoutSession({ code }).unwrap();
      if (result?.data?.url) {
        toast.loading("Redirecting to payment gateway...");
        window.location.href = result.data.url;
      } else {
        throw new Error("Stripe checkout session creation failed");
      }
    } catch (error: any) {
      const errMsg = error?.data?.message || error?.message || "";
      if (errMsg.includes("specifically reserved for")) {
        setMismatchMessage(errMsg);
        setShowMismatchModal(true);
      } else {
        toast.error(errMsg || "Failed to process upgrade");
      }
      setIsProcessing(false);
    }
  };

  // Navigation for unauthenticated visitors
  const handleGoToRegister = () => {
    const emailParam = promoData?.recipientEmail
      ? `&email=${encodeURIComponent(promoData.recipientEmail)}`
      : "";
    router.push(
      `/register?redirect=${encodeURIComponent(`/claim-promo?code=${code}`)}${emailParam}`
    );
  };

  const handleGoToLogin = () => {
    const emailParam = promoData?.recipientEmail
      ? `&email=${encodeURIComponent(promoData.recipientEmail)}`
      : "";
    router.push(
      `/login?redirect=${encodeURIComponent(`/claim-promo?code=${code}`)}${emailParam}`
    );
  };

  const handleGoToCatalog = () => {
    router.push("/catalog");
  };

  const handleGoToPurchasedMaps = () => {
    router.push("/profile/purchased-maps");
  };

  const handleGoToMap = () => {
    if (typeof window !== "undefined") {
      const targetMapId =
        promoMapId ||
        (purchasedMaps[0]
          ? typeof purchasedMaps[0] === "object"
            ? purchasedMaps[0]._id || purchasedMaps[0].id
            : purchasedMaps[0]
          : null);

      if (targetMapId) {
        localStorage.setItem("selectedMapId", String(targetMapId));
      }
      if (mapName && mapName !== "Selected Map") {
        localStorage.setItem("selectedCountryFilter", mapName);
      }
    }
    router.push("/maps");
  };

  const isVipTheme = promoType === "influencer";

  // Render Loader
  if ((isLoadingVerify || isProcessing) && !success && !isClaimedSuccess) {
    return (
      <div className={`flex items-center justify-center min-h-[75vh] py-16 px-4 relative overflow-hidden font-inter ${
        isVipTheme ? "bg-[#0B0F19] text-white" : "bg-[#F9FAFB] text-gray-900"
      }`}>
        <div className="flex flex-col items-center space-y-4 max-w-sm text-center relative z-10">
          <Loader2 className="w-12 h-12 animate-spin text-[#FFC107]" />
          <h3 className="text-xl font-bold tracking-tight">
            {isProcessing
              ? t("promo_claim.activating_access") || "Activating your free map access..."
              : t("promo_claim.verifying") || "Verifying invitation..."}
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            {isProcessing
              ? t("promo_claim.activating_desc") || "Unlocking your map and attaching lifetime access to your account..."
              : t("promo_claim.verifying_desc") || "Please wait while we confirm your invitation details and map access settings."}
          </p>
        </div>
      </div>
    );
  }

  // Case A: Stripe Checkout SUCCESS Redirect
  if (success) {
    return (
      <section className="relative min-h-[75vh] py-16 flex items-center justify-center overflow-hidden font-inter bg-[#F9FAFB] dark:bg-[#0b0f19] text-gray-900 dark:text-slate-100">
        <div className="max-w-md w-full bg-white dark:bg-[#131b2e] rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xl p-8 text-center space-y-6 relative z-10">
          <div className="mx-auto w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-slate-100">{t("promo_claim.upgrade_success") || "Upgrade Successful!"}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
              {t("promo_claim.payment_verified") || "Payment verified. The map access has been successfully added to your account."}
            </p>
          </div>
          <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
            {t("promo_claim.lifetime_granted") || "Status: Lifetime Access Granted ✅"}
          </div>
          <Button
            onClick={handleGoToPurchasedMaps}
            className="w-full h-14 bg-[#FFC107] hover:bg-[#FFB300] text-black font-bold rounded-lg transition-all shadow-lg shadow-yellow-500/20 text-base"
          >
            {t("promo_claim.view_purchased_maps") || "View My Purchased Maps"} <ArrowRight size={18} className="ml-1 inline" />
          </Button>
        </div>
      </section>
    );
  }

  // Case B: Stripe Checkout CANCELLED Redirect
  if (cancelled) {
    return (
      <section className="relative min-h-[75vh] py-16 flex items-center justify-center overflow-hidden font-inter bg-[#F9FAFB] dark:bg-[#0b0f19] text-gray-900 dark:text-slate-100">
        <div className="max-w-md w-full bg-white dark:bg-[#131b2e] rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xl p-8 text-center space-y-6 relative z-10">
          <div className="mx-auto w-16 h-16 bg-amber-50 dark:bg-amber-950/40 rounded-full flex items-center justify-center">
            <XCircle className="w-10 h-10 text-[#FFC107]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-slate-100">{t("promo_claim.checkout_canceled") || "Checkout Canceled"}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
              {t("promo_claim.checkout_canceled_desc") || "Checkout was canceled. No charges were made. You can complete the upgrade whenever you're ready."}
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={handlePaidCheckout}
              className="w-full h-14 bg-[#FFC107] hover:bg-[#FFB300] text-black font-bold rounded-lg shadow-lg shadow-yellow-500/20 text-base"
            >
              {language === "es" ? "Reintentar Pago" : "Retry Checkout"}
            </Button>
            <Button
              onClick={handleGoToCatalog}
              variant="outline"
              className="w-full h-14 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-base"
            >
              {t("promo_claim.explore_public_maps") || (language === "es" ? "Volver al Catálogo" : "Return to Catalog")}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // Case C1: Free Promo Claimed Successfully
  if (isClaimedSuccess) {
    return (
      <section className="relative min-h-[75vh] py-16 flex items-center justify-center overflow-hidden font-inter bg-[#F9FAFB] dark:bg-[#0b0f19] text-gray-900 dark:text-slate-100">
        <div className="max-w-md w-full bg-white dark:bg-[#131b2e] rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xl p-8 text-center space-y-6 relative z-10">
          <div className="mx-auto w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-slate-100">{t("promo_claim.invitation_claimed") || "Invitation Claimed!"}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
              {t("promo_claim.invitation_claimed_desc") || "Your free map access has been activated. Redirecting you to your map now..."}
            </p>
          </div>
          <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/40 text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
            {t("promo_claim.lifetime_granted") || "Status: Lifetime Access Granted ✅"}
          </div>
          <Button
            onClick={handleGoToMap}
            className="w-full h-14 bg-[#FFC107] hover:bg-[#FFB300] text-black font-extrabold rounded-lg transition-all shadow-lg shadow-yellow-500/20 text-base cursor-pointer"
          >
            {t("promo_claim.open_map") || "Open Map"} <ArrowRight size={18} className="ml-1 inline" />
          </Button>
        </div>
      </section>
    );
  }

  // Case C2: Invalid Code / Error State
  if (!isClaimedSuccess && (isErrorVerify || !code)) {
    const errorMsg =
      (verifyError as any)?.data?.message ||
      "Invalid promo link or invitation code.";
    const isAlreadyUsed = typeof errorMsg === "string" && /already been used/i.test(errorMsg);
    const isExpiredMsg = typeof errorMsg === "string" && /expired/i.test(errorMsg);

    // If already used and current logged-in user already has purchased maps
    if (isAlreadyUsed && accessToken && purchasedMaps.length > 0) {
      return (
        <section className="relative min-h-[75vh] py-16 flex items-center justify-center overflow-hidden font-inter bg-[#F9FAFB] dark:bg-[#0b0f19] text-gray-900 dark:text-slate-100">
          <div className="max-w-md w-full bg-white dark:bg-[#131b2e] rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xl p-8 text-center space-y-6 relative z-10">
            <div className="mx-auto w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-slate-100">
                {t("promo_claim.map_already_unlocked") || "Map Already Unlocked!"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
                {t("promo_claim.map_already_unlocked_desc") ||
                  "This invitation has already been redeemed and linked to your account. Your map access is active and ready to explore!"}
              </p>
            </div>
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-800/40 text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              {t("promo_claim.lifetime_active") || "Status: Lifetime Map Access Active ✅"}
            </div>
            <div className="space-y-3">
              <Button
                onClick={handleGoToMap}
                className="w-full h-14 bg-[#FFC107] hover:bg-[#FFB300] text-black font-extrabold rounded-lg transition-all shadow-lg shadow-yellow-500/20 text-base cursor-pointer"
              >
                {t("promo_claim.open_my_map") || "Open My Map"} <ArrowRight size={18} className="ml-1 inline" />
              </Button>
              <Button
                onClick={handleGoToPurchasedMaps}
                variant="outline"
                className="w-full h-12 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-sm cursor-pointer"
              >
                {t("promo_claim.view_all_purchased_maps") || "View All My Purchased Maps"}
              </Button>
            </div>
          </div>
        </section>
      );
    }

    // If already used but user is not logged in
    if (isAlreadyUsed && !accessToken) {
      return (
        <section className="relative min-h-[75vh] py-16 flex items-center justify-center overflow-hidden font-inter bg-[#F9FAFB] dark:bg-[#0b0f19] text-gray-900 dark:text-slate-100">
          <div className="max-w-md w-full bg-white dark:bg-[#131b2e] rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xl p-8 text-center space-y-6 relative z-10">
            <div className="mx-auto w-16 h-16 bg-amber-50 dark:bg-amber-950/40 rounded-full flex items-center justify-center">
              <Lock className="w-10 h-10 text-amber-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-slate-100">
                {t("promo_claim.invitation_already_claimed") || "Invitation Already Claimed"}
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                {t("promo_claim.invitation_already_claimed_desc") ||
                  "This invitation code has already been redeemed. If you previously created an account or redeemed this link, please sign in to access your unlocked map."}
              </p>
            </div>
            <div className="space-y-3 pt-2">
              <Button
                onClick={() => router.push(`/login?redirect=${encodeURIComponent("/maps")}`)}
                className="w-full h-14 bg-[#FFC107] hover:bg-[#FFB300] text-black font-bold rounded-lg shadow-lg shadow-yellow-500/20 text-base cursor-pointer"
              >
                <LogIn size={18} className="mr-2 inline" />
                {t("promo_claim.sign_in_to_view") || "Sign In to View Map"}
              </Button>
              <Button
                onClick={handleGoToCatalog}
                variant="outline"
                className="w-full h-12 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-sm cursor-pointer"
              >
                {t("promo_claim.explore_public_maps") || "Explore Public Maps"}
              </Button>
            </div>
          </div>
        </section>
      );
    }

    const errorHeading = isAlreadyUsed
      ? (language === "es" ? "Invitación Ya Utilizada" : "Invitation Already Used")
      : isExpiredMsg
        ? (language === "es" ? "Invitación Expirada" : "Invitation Expired")
        : (language === "es" ? "Invitación Inválida" : "Invalid Invitation");

    return (
      <section className="relative min-h-[75vh] py-16 flex items-center justify-center overflow-hidden font-inter bg-[#F9FAFB] dark:bg-[#0b0f19] text-gray-900 dark:text-slate-100">
        <div className="max-w-md w-full bg-white dark:bg-[#131b2e] rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xl p-8 text-center space-y-6 relative z-10">
          <div className="mx-auto w-16 h-16 bg-red-50 dark:bg-red-950/40 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-slate-100">{errorHeading}</h2>
            <p className="text-sm text-red-500 font-bold leading-relaxed">{errorMsg}</p>
          </div>
          <div className="space-y-3 pt-2">
            {accessToken && (
              <Button
                onClick={handleGoToMap}
                className="w-full h-14 bg-[#FFC107] hover:bg-[#FFB300] text-black font-bold rounded-lg shadow-lg shadow-yellow-500/20 text-base cursor-pointer"
              >
                {t("promo_claim.go_to_my_maps") || "Go to My Maps"}
              </Button>
            )}
            <Button
              onClick={handleGoToCatalog}
              variant="outline"
              className="w-full h-12 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-200 font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-base cursor-pointer"
            >
              {t("promo_claim.explore_public_maps") || (language === "es" ? "Ver Mapas Públicos" : "View Public Maps")}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // Features list
  const features = [
    {
      icon: MapPin,
      title: language === "es" ? "Lugares y Puntos Curados" : "Curated Places & Spots",
      desc:
        language === "es"
          ? "Puntos de interés seleccionados a mano, incluyendo fotos, paisajes y gastronomía."
          : "Handpicked points of interest including photo locations, sights, and dining.",
    },
    {
      icon: Trophy,
      title: language === "es" ? "Gana Puntos y Recompensas" : "Earn Points and Rewards",
      desc:
        language === "es"
          ? "Acumula puntos, sube de nivel y desbloquea recompensas como itinerarios y mapas digitales gratuitos."
          : "Accumulate points, level up, and unlock rewards such as free itineraries and digital maps.",
    },
    {
      icon: Route,
      title: language === "es" ? "Crea Tus Propias Rutas" : "Create Your Own Routes",
      desc:
        language === "es"
          ? "Planifica, organiza y guarda tus rutas personalizadas para mantener todos tus viajes por carretera en un solo lugar."
          : "Plan, organize, and save your custom routes to keep all your road trips in one place.",
    },
    {
      icon: RefreshCw,
      title: language === "es" ? "Actualizaciones Automáticas" : "Automatic Updates",
      desc:
        language === "es"
          ? "Descubre nuevos lugares turísticos que se añaden automáticamente a tu mapa, sin costo adicional."
          : "Discover new tourist spots that are automatically added to your map—at no extra cost.",
    },
  ];

  // Case D: Render User Claim Split Screen Panel
  return (
    <section className={`relative min-h-[80vh] py-12 sm:py-16 flex items-center overflow-hidden font-inter transition-colors duration-500 ${
      isVipTheme ? "bg-[#0B0F19] text-white" : "bg-[#F9FAFB] dark:bg-[#0b0f19] text-gray-900 dark:text-slate-100"
    }`}>
      {/* Background Split Pattern (Aligns with HeroBanner layout style) */}
      <div className="absolute inset-0 flex pointer-events-none">
        <div className={`w-full relative`}>
          <svg
            className={`absolute inset-0 w-full h-full ${isVipTheme ? "opacity-[0.03] stroke-white" : "opacity-[0.06] dark:opacity-[0.03] stroke-black dark:stroke-white"}`}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" strokeWidth="0.1" />
            <line x1="-20" y1="100" x2="80" y2="0" stroke="currentColor" strokeWidth="0.1" />
            <line x1="20" y1="100" x2="120" y2="0" stroke="currentColor" strokeWidth="0.1" />
          </svg>
          {isVipTheme && (
            <div className="absolute inset-0 bg-[radial-gradient(100%_100%_at_top_right,rgba(250,191,19,0.12),transparent_50%)]" />
          )}
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
        
        {/* Left Column (On mobile: shown after the card; on desktop: on the left) */}
        <motion.div
          className="order-2 lg:order-1 lg:col-span-7 space-y-6 sm:space-y-8"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="space-y-3 sm:space-y-4">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-md ${
                isVipTheme
                  ? "bg-amber-400/10 text-yellow-400 border border-yellow-400/20"
                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40"
              }`}
            >
              {isVipTheme
                ? t("promo_claim.vip_access_badge") || "✨ Premium VIP Access"
                : t("promo_claim.upgrade_badge") || "🗺️ Platform Upgrade"}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              {t("promo_claim.hero_title_1") || "Unlock the Ultimate"}{" "}
              <br className="hidden sm:inline" />
              <span className={isVipTheme ? "text-yellow-400" : "text-[#FFC107]"}>
                {t("promo_claim.hero_title_2") || "Interactive Road Trip Map"}
              </span>
            </h1>
            <p className={`text-sm sm:text-base leading-relaxed max-w-lg ${isVipTheme ? "text-slate-400" : "text-gray-600 dark:text-slate-400"}`}>
              {t("promo_claim.hero_subtitle") ||
                "Welcome to Roadtripeado! Discover hundreds of tourist spots, create your own routes, save your favorites, and enjoy exclusive discounts at local businesses."}
            </p>
          </div>

          {/* Features cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {features.map((feat, index) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={index}
                  className={`flex gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl border transition-all duration-300 group ${
                    isVipTheme
                      ? "bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/60 hover:border-yellow-400/20"
                      : "bg-white dark:bg-[#131b2e] border-gray-100 dark:border-slate-800 hover:shadow-lg shadow-black/5 hover:-translate-y-0.5"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center ${
                      isVipTheme ? "bg-slate-850 text-yellow-400" : "bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400"
                    }`}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-sm tracking-tight text-gray-900 dark:text-slate-100">{feat.title}</h4>
                    <p className={`text-xs leading-relaxed ${isVipTheme ? "text-slate-400" : "text-gray-500 dark:text-slate-400"}`}>
                      {feat.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Right Column: Pre-existing Invitation card (On mobile: shown FIRST for zero-friction access) */}
        <motion.div
          className="order-1 lg:order-2 lg:col-span-5 flex justify-center w-full"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div
            className={`w-full max-w-md rounded-2xl border shadow-xl overflow-hidden ${
              isVipTheme
                ? "bg-[#0E1527] border-slate-800/80 text-white"
                : "bg-white dark:bg-[#131b2e] border-gray-100 dark:border-slate-800 text-gray-900 dark:text-slate-100"
            }`}
          >
            {/* Card Header Banner */}
            <div
              className={`py-4 sm:py-5 px-5 sm:px-6 flex items-center gap-4 border-b ${
                isVipTheme
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-slate-800"
                  : "bg-amber-50/40 dark:bg-[#0e1424] text-gray-900 dark:text-slate-100 border-gray-100 dark:border-slate-800"
              }`}
            >
              <div
                className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
                  isVipTheme ? "bg-black text-yellow-400" : "bg-[#FFC107] text-black"
                }`}
              >
                {isVipTheme ? <Star className="fill-yellow-400" size={22} /> : <Ticket size={22} />}
              </div>
              <div className="min-w-0">
                <span
                  className={`text-[9px] uppercase tracking-widest font-bold block truncate ${
                    isVipTheme ? "text-black/60" : "text-amber-800/70 dark:text-amber-300"
                  }`}
                >
                  {isVipTheme
                    ? t("promo_claim.vip_guest_invitation") || "VIP GUEST INVITATION"
                    : t("promo_claim.exclusive_map_offer") || "EXCLUSIVE MAP OFFER"}
                </span>
                <h2 className="text-base font-extrabold leading-tight truncate">
                  {isVipTheme
                    ? t("promo_claim.exclusive_guest_pass") || "Exclusive Guest Pass"
                    : t("promo_claim.upgrade_map_pass") || "Upgrade Map Pass"}
                </h2>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-5 sm:space-y-6 font-inter">
              {/* Map Target Details */}
              <div
                className={`p-4 rounded-xl border space-y-1 ${
                  isVipTheme ? "bg-slate-900/60 border-slate-800" : "bg-gray-50 dark:bg-[#0e1424] border-gray-100 dark:border-slate-800"
                }`}
              >
                <span className="text-[9px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                  {t("common.target_map") || (language === "es" ? "MAPA OBJETIVO" : "TARGET MAP")}
                </span>
                <h3 className="text-lg font-black flex items-center gap-1.5 leading-tight break-words">
                  {mapName} {isVipTheme && <Sparkles size={14} className="text-yellow-400 shrink-0" />}
                </h3>
                <p className={`text-xs leading-relaxed ${isVipTheme ? "text-slate-400" : "text-gray-500 dark:text-slate-400"}`}>
                  {t("promo_claim.map_benefit_desc") || "Unlocks full geographic locations, guides, pins, and reviews."}
                </p>
              </div>

              {/* Price Row */}
              <div
                className={`flex items-center justify-between py-3 border-y border-dashed ${
                  isVipTheme ? "border-slate-800" : "border-gray-200 dark:border-slate-800"
                }`}
              >
                <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                  {t("promo_claim.upgrade_cost") || "Upgrade Cost"}
                </span>
                {isFree ? (
                  <span className={`text-base font-extrabold uppercase ${isVipTheme ? "text-yellow-400" : "text-green-600 dark:text-green-400"}`}>
                    {t("promo_claim.free_vip_pass") || "Free VIP Pass"}
                  </span>
                ) : (
                  <span className="text-xl font-black">${promoPrice.toFixed(2)} USD</span>
                )}
              </div>

              {/* Warnings / notices */}
              
              {/* Warning A: User already owns the map */}
              {alreadyOwnsMap && (
                <div
                  className={`p-4 rounded-xl border flex gap-3 ${
                    isVipTheme ? "bg-emerald-950/20 border-emerald-800/30" : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100/50 dark:border-emerald-800/40"
                  }`}
                >
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 min-w-0">
                    <h4 className={`text-xs font-bold ${isVipTheme ? "text-emerald-400" : "text-emerald-900 dark:text-emerald-300"}`}>
                      {t("promo_claim.already_unlocked_title") || "Already Unlocked"}
                    </h4>
                    <p className={`text-[10px] leading-relaxed ${isVipTheme ? "text-slate-400" : "text-emerald-700 dark:text-emerald-300/80"}`}>
                      {language === "es"
                        ? `Ya tienes acceso activo a ${mapName} en tu cuenta. Puedes abrirlo y verlo en tu mapa ahora.`
                        : `You already have active access to ${mapName} in your account. You can open and view it in your dashboard now.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Warning B: Email Mismatch */}
              {emailMismatch && !alreadyOwnsMap && (
                <div
                  className={`p-4 rounded-xl border flex flex-col gap-2.5 ${
                    isVipTheme ? "bg-amber-950/20 border-amber-800/30" : "bg-amber-50 dark:bg-amber-950/30 border-amber-100/50 dark:border-amber-800/40"
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    <MailCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 min-w-0">
                      <h4 className={`text-xs font-bold ${isVipTheme ? "text-amber-400" : "text-amber-900 dark:text-amber-300"}`}>
                        {language === "es" ? "Nota de Correo de Cuenta" : "Account Email Note"}
                      </h4>
                      <p className={`text-[10px] leading-relaxed ${isVipTheme ? "text-slate-400" : "text-amber-700 dark:text-amber-300/80"}`}>
                        {language === "es"
                          ? `Esta invitación está específicamente reservada para ${promoData?.recipientEmail}. Has iniciado sesión como ${userProfile?.email}.`
                          : `This invitation is specifically reserved for ${promoData?.recipientEmail}. You are logged in as ${userProfile?.email}.`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const msg = `This invitation is specifically reserved for ${promoData?.recipientEmail}. You are logged in as ${userProfile?.email}.`;
                      setMismatchMessage(msg);
                      setShowMismatchModal(true);
                    }}
                    className={`text-[11px] font-semibold flex items-center gap-1.5 self-start px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      isVipTheme
                        ? "text-yellow-400 hover:bg-yellow-400/10"
                        : "text-amber-800 dark:text-amber-300 hover:bg-amber-100/70 dark:hover:bg-amber-900/30"
                    }`}
                  >
                    <MailCheck size={13} />
                    {language === "es" ? "Ver Detalles del Error" : "View Mismatch Details"}
                  </button>
                </div>
              )}

              {/* Warning C: Not logged in */}
              {!accessToken && (
                <div
                  className={`p-4 rounded-xl border flex gap-3 ${
                    isVipTheme ? "bg-slate-900 border-slate-800" : "bg-yellow-50/70 dark:bg-yellow-950/30 border-yellow-100 dark:border-yellow-800/40"
                  }`}
                >
                  <Lock className={`w-5 h-5 shrink-0 mt-0.5 ${isVipTheme ? "text-yellow-400" : "text-yellow-600 dark:text-yellow-400"}`} />
                  <div className="space-y-0.5 min-w-0">
                    <h4 className={`text-xs font-bold ${isVipTheme ? "text-white" : "text-yellow-900 dark:text-yellow-200"}`}>
                      {t("promo_claim.auth_required_title") || "Sign In or Sign Up Required"}
                    </h4>
                    <p className={`text-[11px] leading-relaxed ${isVipTheme ? "text-slate-300" : "text-yellow-900 dark:text-yellow-300/90"}`}>
                      {promoData?.recipientEmail ? (
                        language === "es" ? (
                          <>
                            Esta invitación fue enviada a <strong className="font-bold underline">{promoData.recipientEmail}</strong>. Por favor inicia sesión o crea una cuenta con <strong className="font-bold underline">{promoData.recipientEmail}</strong> para canjear este mapa.
                          </>
                        ) : (
                          <>
                            This invitation was sent to <strong className="font-bold underline">{promoData.recipientEmail}</strong>. Please sign in or create an account with <strong className="font-bold underline">{promoData.recipientEmail}</strong> to claim this map pass.
                          </>
                        )
                      ) : language === "es" ? (
                        <>
                          Crea una cuenta gratis o inicia sesión para canjear esta invitación exclusiva. El mapa desbloqueado quedará vinculado de por vida a tu perfil.
                        </>
                      ) : (
                        <>
                          Create a free account or sign in to claim this exclusive invitation pass. The unlocked map will be permanently attached to your profile.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div>
                {alreadyOwnsMap ? (
                  <div className="space-y-3">
                    <Button
                      onClick={handleGoToMap}
                      className="w-full h-14 bg-gray-900 hover:bg-black text-white font-bold rounded-lg transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    >
                      {(language === "es" ? `Abrir ${mapName}` : `Open ${mapName}`)} <ArrowRight size={16} className="ml-1.5 inline" />
                    </Button>
                    <Button
                      onClick={handleGoToPurchasedMaps}
                      variant="outline"
                      className={`w-full h-12 font-semibold rounded-lg text-sm transition-all cursor-pointer ${
                        isVipTheme
                          ? "border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
                          : "border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {t("promo_claim.view_all_purchased_maps") || "View All My Purchased Maps"}
                    </Button>
                  </div>
                ) : !accessToken ? (
                  <div className="space-y-3">
                    <Button
                      onClick={handleGoToRegister}
                      className={`w-full h-14 font-bold rounded-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-sm uppercase tracking-wider ${
                        isVipTheme
                          ? "bg-yellow-400 hover:bg-yellow-500 text-black shadow-yellow-400/20"
                          : "bg-[#FFC107] hover:bg-[#FFB300] text-black shadow-yellow-500/20"
                      }`}
                    >
                      <UserPlus size={18} className="mr-2 inline" />
                      {isFree
                        ? t("promo_claim.create_account_claim") || "Create Free Account & Claim"
                        : t("promo_claim.create_account_upgrade") || "Create Account to Upgrade"}
                    </Button>
                    <Button
                      onClick={handleGoToLogin}
                      variant="outline"
                      className={`w-full h-12 font-semibold rounded-lg text-sm transition-all cursor-pointer ${
                        isVipTheme
                          ? "border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
                          : "border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <LogIn size={16} className="mr-2 inline" />
                      {t("promo_claim.already_have_account") || "Already have an account? Log In"}
                    </Button>
                  </div>
                ) : isFree ? (
                  <Button
                    onClick={handleFreeClaim}
                    disabled={isProcessing}
                    className={`w-full h-14 font-bold rounded-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-sm uppercase tracking-wider ${
                      isVipTheme
                        ? "bg-yellow-400 hover:bg-yellow-500 text-black shadow-yellow-400/20"
                        : "bg-green-600 hover:bg-green-700 text-white shadow-green-600/20"
                    }`}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      <>
                        {t("promo_claim.redeem_guest_pass") || "Redeem Guest Pass"} <Unlock size={16} className="ml-1.5 inline" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handlePaidCheckout}
                    disabled={isProcessing}
                    className="w-full h-14 bg-[#FFC107] hover:bg-[#FFB300] text-black font-bold rounded-lg shadow-lg shadow-yellow-500/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-sm uppercase tracking-wider"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      <>
                        {t("promo_claim.confirm_upgrade") || "Confirm Upgrade"} <ShieldCheck size={16} className="ml-1.5 inline" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Custom Email Mismatch Modal ── */}
      {showMismatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#131b2e] rounded-3xl border border-gray-100 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 text-center space-y-6 relative overflow-hidden text-gray-900 dark:text-slate-100">
            {/* Top Banner Icon */}
            <div className="mx-auto w-16 h-16 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 dark:text-amber-400 shadow-sm">
              <MailCheck className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-gray-900 dark:text-slate-100 tracking-tight">
                Account Email Mismatch
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed font-medium px-2">
                {mismatchMessage ||
                  `This invitation is specifically reserved for ${promoData?.recipientEmail}. You are logged in as ${userProfile?.email}.`}
              </p>
            </div>

            <div className="bg-amber-50/70 dark:bg-amber-500/10 p-3.5 rounded-xl border border-amber-200/60 dark:border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 text-left font-medium space-y-1">
              <p className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" /> Important Notice:
              </p>
              <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300/80">
                To claim this map access, please log out of your current account and log in or sign up with <strong>{promoData?.recipientEmail || "the invited email"}</strong>.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <Button
                type="button"
                onClick={() => {
                  setShowMismatchModal(false);
                  dispatch(logout());
                  const targetEmail = promoData?.recipientEmail
                    ? `&email=${encodeURIComponent(promoData.recipientEmail)}`
                    : "";
                  router.push(
                    `/login?redirect=${encodeURIComponent(`/claim-promo?code=${code}`)}${targetEmail}`
                  );
                  toast.info(
                    t("auth.logged_out_invite") ||
                      (language === "es"
                        ? "Sesión cerrada. Inicie sesión con su correo invitado."
                        : "Logged out. Please log in with your invited email.")
                  );
                }}
                className="w-full h-12 bg-[#FFC107] hover:bg-[#FFB300] text-black font-extrabold rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut size={16} />
                Log Out & Switch Account
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMismatchModal(false)}
                className="w-full h-11 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 text-sm cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default function ClaimPromoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[75vh] bg-slate-50 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#FFC107]" />
          <p className="text-sm font-bold text-gray-500 animate-pulse">Retrieving invitation link...</p>
        </div>
      }
    >
      <ClaimPromoContent />
    </Suspense>
  );
}
