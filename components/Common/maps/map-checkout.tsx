"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppDispatch, useAppSelector } from "@/redux/hook";
import { selectAccessToken, setUser } from "@/redux/features/auth/authSlice";
import { useStartGuestMapCheckoutMutation, useCompleteGuestMapCheckoutMutation, useCreateMapCheckoutSessionMutation } from "@/redux/features/payment/paymentApi";
import { useGetMapByIdQuery } from "@/redux/features/map/mapApi";
import { useGetProfileQuery } from "@/redux/features/user/userApi";
import { decodeJwtPayload, getLocalized } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { baseApi } from "@/redux/api/baseApi";
import { persistor } from "@/redux/store";

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
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [completed, setCompleted] = useState(false);
  const started = useRef(false);
  const [startGuest, startState] = useStartGuestMapCheckoutMutation();
  const [completeGuest, completeState] = useCompleteGuestMapCheckoutMutation();
  const [createCheckout, checkoutState] = useCreateMapCheckoutSessionMutation();
  const { data: mapResponse, isLoading: mapLoading } = useGetMapByIdQuery(mapId, { skip: !validMap });
  const { data: profile, isFetching: profileLoading } = useGetProfileQuery({}, { skip: !accessToken });
  const map = mapResponse?.data;
  const ownsMap = profile?.purchasedMaps?.some((item: any) => String(typeof item === "object" ? item._id || item.id : item) === mapId);
  const busy = startState.isLoading || completeState.isLoading || checkoutState.isLoading;
  const resume = `/catalog/checkout?mapId=${encodeURIComponent(mapId)}&resume=1`;
  const loginUrl = `/login?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(resume)}`;
  const recoverUrl = `/set-password?email=${encodeURIComponent(email || currentUser?.email || "")}&redirect=${encodeURIComponent(resume)}`;

  useEffect(() => {
    try { setEmail(JSON.parse(sessionStorage.getItem(storageKey) || "{}").email || ""); } catch { /* recovery links remain available */ }
  }, [storageKey]);

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
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || "{}");
      if (!saved.token) throw new Error(es ? "Verifica tu email para acceder a tu compra." : "Verify your email to access your purchase.");
      // Do not replace another account that signed in while Stripe was open.
      if (accessToken && currentUser?.email?.toLowerCase() !== saved.email) {
        throw new Error(es ? "Has iniciado sesión con otra cuenta. Cierra sesión y verifica el email de compra." : "You are signed in with another account. Sign out and verify the purchase email.");
      }
      const response = await completeGuest({ sessionId, checkoutToken: saved.token }).unwrap();
      if (response.data?.loginRequired) { setNeedsLogin(true); router.push(loginUrl); return; }
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
    setError("");
    try {
      if (accessToken) {
        if (profileLoading || !profile) throw new Error(es ? "Espera a que se cargue tu perfil." : "Please wait for your profile to load.");
        if (ownsMap || map?.isPaid === false) { openMap(); return; }
        const response = await createCheckout({ mapId,
          successUrl: `${window.location.origin}?session_id={CHECKOUT_SESSION_ID}&success=true`,
          cancelUrl: `${window.location.origin}/catalog/checkout?mapId=${mapId}&cancelled=1`,
        }).unwrap();
        if (!response.data?.url) throw new Error("Unable to open checkout.");
        window.location.assign(response.data.url);
        return;
      }
      const normalizedEmail = email.trim().toLowerCase();
      let saved = JSON.parse(sessionStorage.getItem(storageKey) || "{}");
      if (!saved.token || saved.email !== normalizedEmail) {
        const bytes = crypto.getRandomValues(new Uint8Array(32));
        saved = { email: normalizedEmail, token: Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("") };
        // Persist before sending: an interrupted request can safely resume.
        sessionStorage.setItem(storageKey, JSON.stringify(saved));
      }
      const response = await startGuest({ email: normalizedEmail, mapId, checkoutToken: saved.token }).unwrap();
      if (response.data?.loginRequired) { setNeedsLogin(true); router.push(loginUrl); return; }
      if (!response.data?.url) throw new Error("Unable to open checkout.");
      window.location.assign(response.data.url);
    } catch (err: any) {
      setError(err?.data?.message ||
        (err?.status === "TIMEOUT_ERROR" || err?.status === "FETCH_ERROR"
          ? (es ? "No se pudo conectar con el servidor de pagos. Vuelve a intentarlo." : "Could not reach the payment server. Please retry.")
          : err.message || "Unable to start checkout."));
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

  return <main className="min-h-[70vh] flex items-center justify-center px-4 py-12">
    <section className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800 space-y-5">
      <h1 className="text-2xl font-bold">{es ? "Compra tu mapa" : "Purchase your map"}</h1>
      {!validMap || (!mapLoading && !map) ? <p role="alert">{es ? "Mapa no disponible." : "Map unavailable."}</p> : <>
        <p className="font-medium">{mapLoading ? (es ? "Cargando…" : "Loading…") : getLocalized(map.name, language)}</p>
        {params.get("cancelled") && <p>{es ? "Pago cancelado. Puedes volver a intentarlo; tu cuenta se ha guardado." : "Payment cancelled. Your account is saved; you can try again."}</p>}
        {completed ? <>
          <p>{es ? "Tu compra está lista. Verifica tu email para crear una contraseña y recuperar el acceso más adelante." : "Your purchase is ready. Verify your email to set a password and return later."}</p>
          <Button className="w-full" onClick={openMap}>{es ? "Abrir mapa" : "Open Map"}</Button>
          <Link className="block underline" href={recoverUrl}>{es ? "Verificar email y crear contraseña" : "Verify email and set password"}</Link>
        </> : <>
          {sessionId && error && <p role="alert" className="text-red-600">{error}</p>}
          {sessionId ? <>
            <p>{es ? "Comprobamos tu pago antes de abrir el mapa." : "We verify your payment before opening the map."}</p>
            <Button className="w-full" disabled={busy} onClick={finish}>{busy ? (es ? "Verificando…" : "Verifying…") : (es ? "Reintentar verificación" : "Retry verification")}</Button>
          </> : <form className="space-y-4" onSubmit={event => { event.preventDefault(); void buy(); }}>
            {!accessToken && <>
              <label htmlFor="purchase-email" className="block">Email</label>
              <Input id="purchase-email" type="email" autoComplete="email" required maxLength={254} value={email}
                onInvalid={() => setError(es ? "Introduce un email válido para continuar." : "Enter a valid email to continue.")}
                onChange={event => { setEmail(event.target.value); setNeedsLogin(false); setError(""); }} />
              <p className="text-sm text-gray-500">{es ? "Crearemos tu cuenta antes del pago. Podrás crear una contraseña después de verificar tu email." : "We create your account before payment. You can set a password after verifying your email."}</p>
            </>}
            <Button type="submit" className="w-full" disabled={busy || mapLoading || (!!accessToken && profileLoading)}>{busy ? (es ? "Cargando…" : "Loading…") : ownsMap || map?.isPaid === false ? (es ? "Abrir mapa" : "Open Map") : (es ? "Continuar al pago" : "Continue to payment")}</Button>
            {error && <p role="alert" aria-live="polite" className="text-red-600">{error}</p>}
          </form>}
          {needsLogin && <p>{es ? "Esta cuenta ya existe. Inicia sesión o verifica tu email para continuar." : "This account already exists. Sign in or verify your email to continue."}</p>}
          <div className="flex flex-col gap-3 text-sm">
            <Link className="underline" href={loginUrl}>{es ? "Iniciar sesión / Continuar con Google" : "Sign in / Continue with Google"}</Link>
            <Link className="underline" href={recoverUrl}>{es ? "¿Sin contraseña? Verificar email y crear contraseña" : "No password? Verify email and set password"}</Link>
          </div>
        </>}
      </>}
      <Link className="block text-sm underline" href={validMap ? `/catalog/${mapId}` : "/catalog"}>{es ? "Volver al catálogo" : "Back to catalog"}</Link>
    </section>
  </main>;
}
