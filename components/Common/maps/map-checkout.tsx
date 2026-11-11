"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/redux/hook";
import { selectAccessToken, setUser } from "@/redux/features/auth/authSlice";
import { useStartGuestMapCheckoutMutation, useCompleteGuestMapCheckoutMutation, useCreateMapCheckoutSessionMutation } from "@/redux/features/payment/paymentApi";
import { useGetMapByIdQuery } from "@/redux/features/map/mapApi";
import { useGetProfileQuery } from "@/redux/features/user/userApi";
import { decodeJwtPayload, getLocalized } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { baseApi } from "@/redux/api/baseApi";
import { persistor } from "@/redux/store";
import { ArrowLeft, ArrowRight, Loader2, Mail, MapPin } from "lucide-react";

type SavedCheckout = { email: string; token: string };

function readSavedCheckout(storageKey: string): SavedCheckout | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || "{}");
    return typeof saved?.email === "string" && /^[a-f\d]{64}$/.test(saved?.token || "")
      ? { email: saved.email, token: saved.token }
      : null;
  } catch {
    return null;
  }
}

export default function MapCheckout() {
  const params = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector(selectAccessToken);
  const currentUser = useAppSelector(state => state.auth.user);
  const { language } = useLanguage();
  const es = language === "es";
  const mapId = params.get("mapId") || "";
  const sessionId = params.get("session_id");
  const validMap = /^[a-f\d]{24}$/i.test(mapId);
  const storageKey = `map-checkout:${mapId}`;
  const [email, setEmail] = useState("");
  const [hasSavedAttempt, setHasSavedAttempt] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [completed, setCompleted] = useState(false);
  const started = useRef(false);
  const buying = useRef(false);
  const [startGuest, startState] = useStartGuestMapCheckoutMutation();
  const [completeGuest, completeState] = useCompleteGuestMapCheckoutMutation();
  const [createCheckout, checkoutState] = useCreateMapCheckoutSessionMutation();
  const { data: mapResponse, isLoading: mapLoading } = useGetMapByIdQuery(mapId, { skip: !validMap });
  const { data: profile, isFetching: profileLoading } = useGetProfileQuery({}, { skip: !accessToken });
  const map = mapResponse?.data;
  const ownsMap = profile?.purchasedMaps?.some((item: any) => String(typeof item === "object" ? item._id || item.id : item) === mapId);
  const busy = startState.isLoading || completeState.isLoading || checkoutState.isLoading;
  const detailUrl = `/catalog/${encodeURIComponent(mapId)}`;
  const loginFirstUrl = `${detailUrl}?loginRequired=1&redirect=${encodeURIComponent(detailUrl)}`;
  // Recovery must never automatically start another payment. A returned order
  // goes to purchased maps; an unfinished attempt returns to its map details.
  const recoveryDestination = sessionId ? "/profile/purchased-maps" : detailUrl;
  const loginUrlFor = (checkoutEmail: string) => `/login?email=${encodeURIComponent(checkoutEmail)}&redirect=${encodeURIComponent(recoveryDestination)}`;
  const loginUrl = loginUrlFor(email || currentUser?.email || "");
  const recoverUrl = `/set-password?email=${encodeURIComponent(email || currentUser?.email || "")}&redirect=${encodeURIComponent(recoveryDestination)}`;

  useEffect(() => {
    // Read legacy capabilities only. New visitors must register or log in first.
    const saved = readSavedCheckout(storageKey);
    setEmail(saved?.email || "");
    setHasSavedAttempt(Boolean(saved));
    setStorageReady(true);
  }, [storageKey]);

  useEffect(() => {
    // Stripe returns must reach verification even after storage is lost.
    if (validMap && storageReady && !accessToken && !sessionId && !hasSavedAttempt) {
      router.replace(loginFirstUrl);
    }
  }, [validMap, storageReady, accessToken, sessionId, hasSavedAttempt, loginFirstUrl, router]);

  const openMap = () => {
    localStorage.setItem("selectedMapId", mapId);
    if (map?.name) localStorage.setItem("selectedCountryFilter", typeof map.name === "string" ? map.name : getLocalized(map.name, language));
    router.replace("/maps");
  };

  useEffect(() => {
    // A refresh after completion can rely on this account's existing entitlement.
    if (sessionId && accessToken && ownsMap && map) openMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, accessToken, ownsMap, map]);

  const finish = async () => {
    setError("");
    try {
      const saved = readSavedCheckout(storageKey);
      if (!saved) throw new Error(es ? "Verifica tu email para acceder a tu compra." : "Verify your email to access your purchase.");
      // Do not replace another account that signed in while Stripe was open.
      if (accessToken && currentUser?.email?.toLowerCase() !== saved.email) {
        throw new Error(es ? "Has iniciado sesión con otra cuenta. Cierra sesión y verifica el email de compra." : "You are signed in with another account. Sign out and verify the purchase email.");
      }
      const response = await completeGuest({ sessionId, checkoutToken: saved.token }).unwrap();
      if (response.data?.loginRequired) { setNeedsLogin(true); router.push(loginUrlFor(saved.email)); return; }
      const token = response.data?.accessToken;
      if (!token) throw new Error("Please sign in to access your purchase.");
      const decoded = decodeJwtPayload(token);
      dispatch(setUser({ accessToken: token, user: { id: decoded.authId, email: decoded.email, name: decoded.name || "", role: decoded.role, image: "" } }));
      dispatch(baseApi.util.resetApiState());
      await persistor.flush();
      sessionStorage.removeItem(storageKey);
      setCompleted(true);
    } catch (err: any) {
      setError(err?.data?.message || err.message || "Unable to verify payment. Please retry.");
    }
  };

  useEffect(() => {
    if (completed && map) openMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed, map]);

  const buy = async () => {
    if (buying.current) return;
    buying.current = true;
    setError("");
    try {
      if (accessToken) {
        if (profileLoading || !profile) throw new Error(es ? "Espera a que se cargue tu perfil." : "Please wait for your profile to load.");
        if (ownsMap || map?.isPaid === false) { openMap(); return; }
        const response = await createCheckout({ mapId,
          successUrl: `${window.location.origin}?session_id={CHECKOUT_SESSION_ID}&success=true&open_map=1`,
          cancelUrl: `${window.location.origin}/catalog/checkout?mapId=${mapId}&cancelled=1`,
        }).unwrap();
        if (!response.data?.url) throw new Error("Unable to open checkout.");
        window.location.assign(response.data.url);
        return;
      }
      const saved = readSavedCheckout(storageKey);
      if (!saved) {
        router.replace(loginFirstUrl);
        return;
      }
      const response = await startGuest({ email: saved.email, mapId, checkoutToken: saved.token }).unwrap();
      if (response.data?.loginRequired) { setNeedsLogin(true); router.push(loginUrlFor(saved.email)); return; }
      if (!response.data?.url) throw new Error("Unable to open checkout.");
      window.location.assign(response.data.url);
    } catch (err: any) {
      setError(err?.data?.message ||
        (err?.status === "TIMEOUT_ERROR" || err?.status === "FETCH_ERROR"
          ? (es ? "No se pudo conectar con el servidor de pagos. Vuelve a intentarlo." : "Could not reach the payment server. Please retry.")
          : err.message || "Unable to start checkout."));
    } finally {
      buying.current = false;
    }
  };

  useEffect(() => {
    if (started.current || !validMap) return;
    if (sessionId) { started.current = true; void finish(); }
    else if (params.get("resume") === "1" && accessToken && profile && !profileLoading && map) {
      started.current = true; void buy();
    }
    // One automatic attempt; retries are explicit and never create another checkout on render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, accessToken, profile, profileLoading, map, validMap]);

  if (validMap && !sessionId && !accessToken && (!storageReady || !hasSavedAttempt)) {
    return <main className="min-h-[75vh] flex items-center justify-center" aria-busy="true">
      <Loader2 className="size-6 animate-spin" aria-label={es ? "Cargando…" : "Loading…"} />
    </main>;
  }

  return <main className="min-h-[75vh] flex items-center justify-center bg-slate-50/70 px-4 py-10 sm:py-16 dark:bg-slate-950/30">
    <section className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_32px_-16px_rgba(15,23,42,0.2)] sm:p-8 dark:bg-slate-900 dark:border-slate-800 space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-950 dark:text-slate-50">
          {!accessToken && !sessionId ? (es ? "Continúa tu compra" : "Resume your purchase") : (es ? "Compra tu mapa" : "Purchase your map")}
        </h1>
        {!accessToken && !sessionId && <p id="checkout-email-help" className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {es ? "Continúa el pago que ya habías iniciado con este email." : "Continue the checkout you previously started with this email."}
        </p>}
      </div>
      {!validMap || (!mapLoading && !map) ? <p role="alert">{es ? "Mapa no disponible." : "Map unavailable."}</p> : <>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300"><MapPin className="size-5" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">{es ? "Tu mapa" : "Your map"}</p>
            <p className="font-semibold leading-snug text-slate-950 dark:text-slate-100">{mapLoading ? (es ? "Cargando…" : "Loading…") : getLocalized(map.name, language)}</p>
          </div>
          {!mapLoading && map?.isPaid && typeof map.price === "number" && <p className="shrink-0 text-right text-lg font-bold tabular-nums text-slate-950 dark:text-slate-100">
            {new Intl.NumberFormat(es ? "es-US" : "en-US", { style: "currency", currency: "USD" }).format(map.price)}
            <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">USD</span>
          </p>}
        </div>
        {params.get("cancelled") && <p>{es ? "Pago cancelado. Puedes volver a intentarlo; tu cuenta se ha guardado." : "Payment cancelled. Your account is saved; you can try again."}</p>}
        {completed ? <>
          <p>{es ? "Tu compra está lista. Verifica tu email para crear una contraseña y recuperar el acceso más adelante." : "Your purchase is ready. Verify your email to set a password and return later."}</p>
          <Button className="w-full" onClick={openMap}>{es ? "Abrir mapa" : "Open Map"}</Button>
          <Link className="block underline" href={recoverUrl}>{es ? "Verificar email y crear contraseña" : "Verify email and set password"}</Link>
        </> : <>
          {sessionId && error && <>
            <p role="alert" className="text-red-600">{error}</p>
            <div className="flex flex-wrap gap-4 text-sm font-medium">
              <Link className="underline" href={loginUrl}>{es ? "Iniciar sesión" : "Sign in"}</Link>
              <Link className="underline" href={recoverUrl}>{es ? "Verificar email y crear contraseña" : "Verify email and set password"}</Link>
            </div>
          </>}
          {sessionId ? <>
            <p>{es ? "Comprobamos tu pago antes de abrir el mapa." : "We verify your payment before opening the map."}</p>
            <Button className="w-full" disabled={busy} onClick={finish}>{busy ? (es ? "Verificando…" : "Verifying…") : (es ? "Reintentar verificación" : "Retry verification")}</Button>
          </> : <form className="space-y-5" onSubmit={event => { event.preventDefault(); void buy(); }}>
            {!accessToken && <>
              <div className="space-y-2">
              <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">{es ? "Correo electrónico" : "Email address"}</span>
              <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <p id="purchase-email" aria-describedby="checkout-email-help" className="min-h-12 break-all rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 dark:border-slate-700 dark:bg-slate-950/40">{email}</p>
              </div>
              </div>
            </>}
            <Button type="submit" className="h-12 w-full gap-3 rounded-xl bg-[#FFC107] text-base font-semibold text-slate-950 hover:bg-[#efb400] disabled:opacity-60" disabled={busy || mapLoading || (!!accessToken && profileLoading)}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {busy ? (es ? "Preparando tu pago…" : "Preparing your checkout…") : ownsMap || map?.isPaid === false ? (es ? "Abrir mapa" : "Open Map") : (es ? "Continuar al pago" : "Continue to payment")}
              {!busy && <ArrowRight className="size-4" aria-hidden="true" />}
            </Button>
            {!ownsMap && map?.isPaid !== false && <p className="text-center text-xs text-slate-500 dark:text-slate-400">{es ? "El siguiente paso es el pago seguro con Stripe." : "Next, you’ll pay securely with Stripe."}</p>}
            {error && <p role="alert" aria-live="polite" className="text-red-600">{error}</p>}
          </form>}
          {needsLogin && <p>{es ? "Esta cuenta ya existe. Inicia sesión o verifica tu email para continuar." : "This account already exists. Sign in or verify your email to continue."}</p>}
        </>}
      </>}
      <div className="border-t border-slate-100 pt-4 text-center dark:border-slate-800">
        <Link className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100" href={validMap ? `/catalog/${mapId}` : "/catalog"}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          {validMap ? (es ? "Volver a los detalles del mapa" : "Back to map details") : (es ? "Volver al catálogo" : "Back to catalog")}
        </Link>
      </div>
    </section>
  </main>;
}
