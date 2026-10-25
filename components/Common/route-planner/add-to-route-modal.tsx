"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Compass,
  X,
  Plus,
  Check,
  MapPin,
  FolderHeart,
  Loader2,
  ExternalLink,
  Route as RouteIcon,
  Lock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { SafeImage } from "@/components/shared/safe-image";
import { getUsableMediaUrl, getLocalized } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { CategoryIcon } from "@/components/shared/categories/category-icon";
import { useAppSelector } from "@/redux/hook";
import { selectAccessToken } from "@/redux/features/auth/authSlice";
import {
  useGetMyRoutePlansQuery,
  useAddStopToRouteMutation,
  useCreateRoutePlanMutation,
} from "@/redux/features/route-plan/routePlanApi";
import {
  addLocationToRouteDraft,
  isLocationInRouteDraft,
  getRouteDraft,
} from "@/lib/route-planner-utils";
import { toast } from "sonner";
import Link from "next/link";

interface AddToRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: any;
  type?: "place" | "business";
}

export default function AddToRouteModal({
  isOpen,
  onClose,
  location,
  type = "place",
}: AddToRouteModalProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const accessToken = useAppSelector(selectAccessToken);

  const placeId = location?._id || location?.id;
  const isBusiness = type === "business" || location?.type === "business";

  // Track added routes in current session
  const [addedRouteIds, setAddedRouteIds] = useState<string[]>([]);
  const [addingRouteId, setAddingRouteId] = useState<string | null>(null);

  // New Route Creation state
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newRouteName, setNewRouteName] = useState("");

  // Queries & Mutations
  const {
    data: myRoutesRes,
    isLoading: isLoadingRoutes,
    refetch: refetchMyRoutes,
  } = useGetMyRoutePlansQuery({ limit: 50 }, { skip: !isOpen || !accessToken });

  const [addStopToRoute] = useAddStopToRouteMutation();
  const [createRoutePlan, { isLoading: isCreatingRoute }] = useCreateRoutePlanMutation();

  const savedRoutes: any[] = myRoutesRes?.data?.data || myRoutesRes?.data || [];

  // Local draft route (fallback when not logged in or no cloud routes yet)
  const localDraft = useMemo(() => {
    if (typeof window === "undefined") return null;
    return getRouteDraft();
  }, [isOpen, addedRouteIds]);

  const isInLocalDraft = placeId ? isLocationInRouteDraft(placeId) : false;

  useEffect(() => {
    if (!isOpen) {
      setIsCreatingNew(false);
      setNewRouteName("");
      setAddingRouteId(null);
    }
  }, [isOpen]);

  if (!isOpen || !location) return null;

  if (location.isLocked) {
    const pMapId = typeof location.map === "object" ? (location.map?._id || location.map?.id) : location.map;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-md bg-white dark:bg-[#131b2e] rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-slate-800 text-center space-y-5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 hover:text-gray-700 dark:hover:text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-16 h-16 bg-amber-500/10 dark:bg-amber-400/10 text-amber-500 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-950 dark:text-white">
              {t("map.unlock_full_map") || "Desbloquear mapa"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-2 leading-relaxed">
              {t("place.locked_alert_desc") ||
                "Esta atracción turística es exclusiva de los mapas adquiridos. Compra el mapa para planificar rutas con este lugar."}
            </p>
          </div>
          <Link
            href={pMapId ? `/catalog/${pMapId}` : "/catalog"}
            onClick={onClose}
            className="w-full inline-block"
          >
            <button
              type="button"
              className="w-full py-3.5 px-4 rounded-xl bg-[#fabf13] hover:bg-[#e6ad06] text-gray-950 font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              {t("map.buy_map") || "Comprar mapa"}
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const placeName = getLocalized(location.name, language) || "Lugar sin nombre";
  const catName = getLocalized(location.category?.name, language);
  const catIcon = location.category?.icon;
  const address = location.address || location.location?.address || location.location?.city || "";
  const cover = getUsableMediaUrl(location.media?.photos || location.media || location.images);

  // 1. Handle adding to a cloud route
  const handleAddToCloudRoute = async (route: any) => {
    const routeId = route._id || route.id;
    if (!routeId) return;

    setAddingRouteId(routeId);
    try {
      const payload: any = {
        id: routeId,
        stop: {
          place: isBusiness ? undefined : placeId,
          business: isBusiness ? placeId : undefined,
          type: isBusiness ? "Business" : "Place",
        },
      };

      await addStopToRoute(payload).unwrap();
      setAddedRouteIds((prev) => [...prev, routeId]);

      // If this route is currently in local storage draft, sync it
      if (localDraft?.routeId === routeId) {
        addLocationToRouteDraft(location, { language });
      }

      refetchMyRoutes();

      toast.success(
        language === "es"
          ? `¡Añadido con éxito a "${route.name}"!`
          : `Successfully added to "${route.name}"!`,
        {
          action: {
            label: language === "es" ? "Ver Ruta" : "View Route",
            onClick: () => {
              onClose();
              router.push(`/saved-routes?viewRouteId=${routeId}`);
            },
          },
        }
      );
    } catch (err: any) {
      const msg =
        err?.data?.message ||
        (language === "es"
          ? "Error al añadir la parada a la ruta"
          : "Error adding stop to route");
      toast.error(msg);
    } finally {
      setAddingRouteId(null);
    }
  };

  // 2. Handle adding to local route (when user has no cloud routes or is guest)
  const handleAddToLocalRoute = () => {
    const result = addLocationToRouteDraft(location, { language });
    if (result.success) {
      setAddedRouteIds((prev) => [...prev, "local-draft"]);
      toast.success(
        language === "es"
          ? `¡Añadido a tu ruta "${localDraft?.name || "Mi Roadtrip"}"!`
          : `Added to your route "${localDraft?.name || "My Roadtrip"}"!`,
        {
          action: {
            label: language === "es" ? "Ver Ruta" : "View Route",
            onClick: () => {
              onClose();
              router.push("/route-planner");
            },
          },
        }
      );
    } else if (result.alreadyExists) {
      toast.info(
        language === "es"
          ? `Este lugar ya está en tu ruta`
          : `This place is already in your route`
      );
    } else {
      toast.error(result.message);
    }
  };

  // 3. Handle creating a new route
  const handleCreateNewRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRouteName.trim()) {
      toast.error(
        language === "es"
          ? "Por favor ingresa un nombre para la ruta"
          : "Please enter a route name"
      );
      return;
    }

    if (accessToken) {
      try {
        const payload: any = {
          name: newRouteName.trim(),
          stops: [
            {
              place: isBusiness ? undefined : placeId,
              business: isBusiness ? placeId : undefined,
              type: isBusiness ? "Business" : "Place",
              order: 1,
            },
          ],
        };

        const res = await createRoutePlan(payload).unwrap();
        const createdId = res?.data?._id || res?.data?.id || res?._id;
        setNewRouteName("");
        setIsCreatingNew(false);
        refetchMyRoutes();

        toast.success(
          language === "es"
            ? `¡Ruta "${payload.name}" creada con este lugar!`
            : `Route "${payload.name}" created with this place!`,
          {
            action: {
              label: language === "es" ? "Ver Ruta" : "View Route",
              onClick: () => {
                onClose();
                if (createdId) {
                  router.push(`/saved-routes?viewRouteId=${createdId}`);
                } else {
                  router.push("/saved-routes");
                }
              },
            },
          }
        );
      } catch (err: any) {
        const msg =
          err?.data?.message ||
          (language === "es" ? "Error al crear la ruta" : "Error creating route");
        toast.error(msg);
      }
    } else {
      // Guest: create local route with this name
      addLocationToRouteDraft(location, {
        language,
        defaultName: newRouteName.trim(),
      });
      setIsCreatingNew(false);
      setNewRouteName("");
      toast.success(
        language === "es"
          ? `¡Ruta "${newRouteName.trim()}" creada con este lugar!`
          : `Route "${newRouteName.trim()}" created with this place!`,
        {
          action: {
            label: language === "es" ? "Ver Ruta" : "View Route",
            onClick: () => {
              onClose();
              router.push("/route-planner");
            },
          },
        }
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md transition-opacity animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-[#131b2e] rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800/80 flex items-center justify-between flex-shrink-0 bg-white/95 dark:bg-[#131b2e]/95 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center text-amber-500 dark:text-amber-400 shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-gray-950 dark:text-white tracking-tight">
                {language === "es" ? "Añadir a la Ruta" : "Add to Route"}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                {language === "es"
                  ? "Elige en cuál de tus rutas deseas guardar este lugar"
                  : "Choose which route to save this place to"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Place Summary Banner */}
        <div className="px-5 py-3 bg-amber-50/50 dark:bg-slate-900/40 border-b border-gray-100 dark:border-slate-800/80 flex items-center gap-3 shrink-0">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-gray-100 dark:bg-slate-800 border border-black/5 dark:border-white/10 flex items-center justify-center">
            {cover ? (
              <SafeImage src={cover} alt={placeName} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-400/20 to-orange-500/20 text-amber-600 dark:text-amber-400">
                <Compass className="w-5 h-5" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {catName && (
              <div className="flex items-center gap-1.5 mb-0.5">
                {catIcon && (
                  <div
                    className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                    style={{ backgroundColor: location.category?.color || "#FA7B17" }}
                  >
                    <CategoryIcon icon={catIcon} size={9} color="#FFFFFF" />
                  </div>
                )}
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider truncate">
                  {catName}
                </span>
              </div>
            )}
            <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">
              {placeName}
            </h4>
            {address && (
              <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 shrink-0 text-gray-400" />
                <span className="truncate">{address}</span>
              </p>
            )}
          </div>
        </div>

        {/* Modal Scrollable Body: Single Unified Routes List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 flex items-center gap-1.5">
              <FolderHeart className="w-3.5 h-3.5 text-amber-500" />
              {language === "es" ? "Tus Rutas" : "Your Routes"}
            </span>

            {accessToken && savedRoutes.length > 0 && (
              <Link
                href="/saved-routes"
                onClick={onClose}
                className="text-[11px] font-bold text-gray-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1"
              >
                <span>{language === "es" ? "Ver todas" : "View all"}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </Link>
            )}
          </div>

          {/* If user is logged in and has cloud routes */}
          {accessToken && isLoadingRoutes ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span className="text-xs">
                {language === "es" ? "Cargando tus rutas..." : "Loading your routes..."}
              </span>
            </div>
          ) : accessToken && savedRoutes.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {savedRoutes.map((route: any) => {
                const routeId = route._id || route.id;
                const stopsCount = Array.isArray(route.stops) ? route.stops.length : 0;
                const isAlreadyInThisRoute =
                  addedRouteIds.includes(routeId) ||
                  (Array.isArray(route.stops) &&
                    route.stops.some(
                      (s: any) =>
                        (s.place && (s.place._id === placeId || s.place === placeId)) ||
                        (s.business && (s.business._id === placeId || s.business === placeId))
                    ));
                const isMutating = addingRouteId === routeId;

                return (
                  <div
                    key={routeId}
                    className="p-3 rounded-2xl bg-white dark:bg-[#151e33] border border-gray-200 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-amber-400/50 transition-colors shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-500 flex items-center justify-center shrink-0">
                        <RouteIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100 truncate">
                          {route.name}
                        </h5>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400">
                          {stopsCount}{" "}
                          {stopsCount === 1
                            ? language === "es"
                              ? "parada"
                              : "stop"
                            : language === "es"
                            ? "paradas"
                            : "stops"}
                        </p>
                      </div>
                    </div>

                    {isAlreadyInThisRoute ? (
                      <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>{language === "es" ? "Añadido" : "Added"}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() => handleAddToCloudRoute(route)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#fabf13] hover:bg-[#e0ac10] text-gray-950 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        {isMutating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        )}
                        <span>{language === "es" ? "Añadir" : "Add"}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Fallback single route card (for guest or when user has no cloud routes yet) */
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#151e33] border border-gray-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-500 flex items-center justify-center shrink-0">
                  <RouteIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h5 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100 truncate">
                    {localDraft?.name || (language === "es" ? "Mi Roadtrip" : "My Roadtrip")}
                  </h5>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    {localDraft?.stops?.length || 0}{" "}
                    {(localDraft?.stops?.length || 0) === 1
                      ? language === "es"
                        ? "parada"
                        : "stop"
                      : language === "es"
                      ? "paradas"
                      : "stops"}
                  </p>
                </div>
              </div>

              {isInLocalDraft || addedRouteIds.includes("local-draft") ? (
                <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{language === "es" ? "Añadido" : "Added"}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAddToLocalRoute}
                  className="px-3.5 py-1.5 rounded-xl bg-[#fabf13] hover:bg-[#e0ac10] text-gray-950 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{language === "es" ? "Añadir" : "Add"}</span>
                </button>
              )}
            </div>
          )}

          {/* Create New Route Section */}
          <div className="pt-2">
            {!isCreatingNew ? (
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className="w-full py-2.5 px-4 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700 hover:border-amber-400 hover:bg-amber-50/40 dark:hover:bg-slate-900/40 text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-amber-500 stroke-[2.5]" />
                <span>
                  {language === "es"
                    ? "+ Crear nueva ruta con este lugar"
                    : "+ Create new route with this place"}
                </span>
              </button>
            ) : (
              <form
                onSubmit={handleCreateNewRoute}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-amber-500/40 space-y-2.5 animate-in fade-in-50 duration-150"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 dark:text-slate-100">
                    {language === "es" ? "Nombre de la nueva ruta" : "New route name"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRouteName}
                    onChange={(e) => setNewRouteName(e.target.value)}
                    placeholder={
                      language === "es"
                        ? "Ej. Roadtrip Fin de Semana"
                        : "e.g. Weekend Roadtrip"
                    }
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-900 dark:text-slate-100 focus:outline-none focus:border-amber-400"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isCreatingRoute || !newRouteName.trim()}
                    className="px-3.5 py-2 rounded-xl bg-[#fabf13] hover:bg-[#e0ac10] text-gray-950 text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {isCreatingRoute ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                    <span>{language === "es" ? "Crear y Añadir" : "Create & Add"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
