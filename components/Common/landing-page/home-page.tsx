"use client";

import DealsSection from "@/components/Common/landing-page/deals-section";
import ExploreMaps from "@/components/Common/landing-page/explore-maps";
import { Features } from "@/components/Common/landing-page/features";
import HeroBanner from "@/components/Common/landing-page/hero-banner";
import HowItWorks from "@/components/Common/landing-page/how-it-works";
import MapCollection from "@/components/Common/landing-page/map-collection";
import MapEasier from "@/components/Common/landing-page/map-easier";
import PromoteBusiness from "@/components/Common/landing-page/promote-business";
import StartExploring from "@/components/Common/landing-page/start-exploring";
import { LazyMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGetProfileQuery } from "@/redux/features/user/userApi";
import { useVerifyCheckoutSessionQuery } from "@/redux/features/payment/paymentApi";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAppSelector } from "@/redux/hook";
import { selectAccessToken } from "@/redux/features/auth/authSlice";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const loadAnimationFeatures = () => import("@/components/Common/landing-page/animation-features").then(module => module.default);

export default function HomePage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const openPurchasedMap = searchParams.get("open_map") === "1";

  const accessToken = useAppSelector(selectAccessToken);
  const currentUser = useAppSelector((state) => state.auth.user);

  // Synchronously detect auth from cookies or persisted storage on client render 1
  const [hasAuthClient, setHasAuthClient] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      if (document.cookie.includes("loggedIn=1") || document.cookie.includes("accessToken=")) {
        return true;
      }
      const persisted = localStorage.getItem("persist:auth");
      if (persisted) {
        const parsed = JSON.parse(persisted);
        if (parsed.accessToken && parsed.accessToken !== "null") return true;
        if (parsed.user && parsed.user !== "null") return true;
      }
    } catch { }
    return false;
  });

  useEffect(() => {
    if (typeof document !== "undefined") {
      const hasCookie =
        document.cookie.includes("loggedIn=1") ||
        document.cookie.includes("accessToken=");
      if (hasCookie) setHasAuthClient(true);
    }
  }, []);

  const isAuthed = Boolean(accessToken || currentUser || hasAuthClient);

  // Skip profile query for unauthenticated guests to avoid wasteful 401 calls
  const { data: userProfile } = useGetProfileQuery({}, { skip: !isAuthed });

  // Trigger verify checkout query if session_id query exists
  const { data: verifyData, error: verifyError, isLoading: isVerifying, refetch: retryVerification } = useVerifyCheckoutSessionQuery(
    sessionId || "",
    { skip: !sessionId }
  );

  useEffect(() => {
    if (verifyData) {
      if (openPurchasedMap) {
        const payment = verifyData.data;
        const buyerId = typeof payment?.userId === "object" ? payment.userId?._id : payment?.userId;
        const accountId = currentUser?.id || userProfile?._id;
        if (!accessToken || !accountId) return;
        if (payment?.status !== "succeeded") return;
        if (String(buyerId) !== String(accountId)) {
          toast.error(t("payment.failed"));
          router.replace("/profile/purchased-maps");
          return;
        }
        const mapId = typeof payment.mapId === "object" ? payment.mapId?._id : payment.mapId;
        if (mapId) {
          localStorage.setItem("selectedMapId", String(mapId));
          localStorage.removeItem("selectedCountryFilter");
          router.replace(`/maps?mapId=${encodeURIComponent(String(mapId))}`);
          return;
        }
      }
      toast.success(t("payment.verified_redirecting"));
      router.replace("/profile/purchased-maps");
    } else if (verifyError) {
      if (openPurchasedMap) return;
      toast.error(t("payment.failed"));
      router.replace("/maps");
    }
  }, [verifyData, verifyError, router, t, openPurchasedMap, accessToken, currentUser?.id, userProfile?._id]);

  useEffect(() => {
    // Only auto-redirect to /maps if we are NOT currently verifying a Stripe checkout session
    if (sessionId) return;
    if (searchParams.get("loginRequired") === "1") return;
    if (isAuthed || userProfile) {
      router.replace("/maps");
    }
  }, [isAuthed, userProfile, router, sessionId, searchParams]);

  // Recover the original payment without starting another checkout.
  if (sessionId && openPurchasedMap && !isVerifying &&
      (verifyError || (verifyData && verifyData.data?.status !== "succeeded") || !accessToken)) {
    const returnPath = `/?session_id=${encodeURIComponent(sessionId)}&success=true&open_map=1`;
    return <main className="min-h-[70vh] flex items-center justify-center px-4">
      <section className="w-full max-w-md space-y-5 text-center">
        <h1 className="text-2xl font-bold">{language === "es" ? "Verifica tu pago" : "Verify your payment"}</h1>
        {(verifyError || (verifyData && verifyData.data?.status !== "succeeded")) &&
          <p role="alert">{t("payment.failed")}</p>}
        <p>{language === "es" ? "Comprueba el pago o inicia sesión con la cuenta de tu compra. No necesitas volver a pagar." : "Retry verification or sign in with your purchase account. You do not need to pay again."}</p>
        <button type="button" className="rounded-lg bg-yellow-400 px-6 py-3 font-semibold text-black" onClick={() => retryVerification()}>
          {language === "es" ? "Reintentar verificación" : "Retry verification"}
        </button>
        {!accessToken && <div className="flex flex-col gap-3">
          <a className="underline" href={`/login?redirect=${encodeURIComponent(returnPath)}`}>{t("nav.login")}</a>
          <a className="underline" href={`/set-password?redirect=${encodeURIComponent(returnPath)}`}>{t("auth.login_verify_to_set_password")}</a>
        </div>}
      </section>
    </main>;
  }

  // Loading state for checkout verification
  if (sessionId && isVerifying) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0f0f0f] text-white">
        <Loader2 className="h-12 w-12 animate-spin text-yellow-400 mb-4" />
        <h2 className="text-xl font-bold font-inter">{t("common.loading")}</h2>
        <p className="text-gray-400 mt-2 text-sm">{t("payment.do_not_close")}</p>
      </div>
    );
  }

  // Authenticated users keep the existing redirect loading state.
  // Show a neutral loading spinner while redirecting to /maps.
  if ((isAuthed || userProfile) && !sessionId) {
    return (
      <div className="flex h-[calc(100vh-90px)] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
      </div>
    );
  }

  // If user is not logged in, show landing page
  return (
    <LazyMotion features={loadAnimationFeatures}>
    <main>
      <HeroBanner />
      <HowItWorks />
      <Features />
      <ExploreMaps />
      <PromoteBusiness />
      <DealsSection />
      <MapCollection />
      <MapEasier />
      <StartExploring />
    </main>
    </LazyMotion>
  );
}
