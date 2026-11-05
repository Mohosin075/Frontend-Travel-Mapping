"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useGetMyRoutePlansQuery,
  useGetRoutePlanByIdQuery,
  useDeleteRoutePlanMutation,
} from "@/redux/features/route-plan/routePlanApi";
import {
  Compass,
  Navigation,
  Trash2,
  Calendar,
  MapPin,
  Search,
  Plus,
  ArrowRight,
  Pencil,
  X,
} from "lucide-react";
import { SafeImage } from "@/components/shared/safe-image";
import { getUsableMediaUrl, getLocalized } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useLoginRequired } from "@/components/shared/login-required-modal";
import { useAppSelector } from "@/redux/hook";
import { selectAccessToken } from "@/redux/features/auth/authSlice";
import RouteDetailViewModal from "@/components/Common/route-planner/route-detail-view-modal";
import { CountryFilter, useCountryFilter } from "@/components/shared/country-filter";

export default function SavedRoutes() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewRouteIdParam = searchParams.get("viewRouteId");
  const { openLoginRequired } = useLoginRequired();
  const accessToken = useAppSelector(selectAccessToken);
  const [search, setSearch] = useState("");
  const [viewingRoute, setViewingRoute] = useState<any | null>(null);
  const countryFilter = useCountryFilter({ allowAll: false });

  const { currentData: myRoutesRes, isFetching: isLoading } = useGetMyRoutePlansQuery(
    { limit: 100, country: countryFilter.country || undefined },
    { skip: !accessToken || !countryFilter.ready || !countryFilter.country }
  );
  const { currentData: directRouteRes } = useGetRoutePlanByIdQuery(viewRouteIdParam as string, {
    skip: !viewRouteIdParam || !accessToken,
    refetchOnMountOrArgChange: true,
  });
  const [deleteRoutePlan] = useDeleteRoutePlanMutation();

  const allRoutes: any[] = useMemo(() => {
    return myRoutesRes?.data?.data || myRoutesRes?.data || [];
  }, [myRoutesRes]);

  // Sync viewingRoute with URL parameter ?viewRouteId=...
  useEffect(() => {
    if (viewRouteIdParam) {
      const match = allRoutes.find(
        (r) => (r._id || r.id) === viewRouteIdParam
      );
      if (directRouteRes?.data) {
        setViewingRoute(directRouteRes.data);
      } else if (match) {
        setViewingRoute(match);
      } else {
        setViewingRoute(null);
      }
    } else if (!viewRouteIdParam && viewingRoute) {
      setViewingRoute(null);
    }
  }, [viewRouteIdParam, allRoutes, directRouteRes]);

  // Listen for browser popstate (Back/Forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("viewRouteId");
      if (id && allRoutes.length > 0) {
        const match = allRoutes.find((r) => (r._id || r.id) === id);
        if (match) setViewingRoute(match);
      } else {
        setViewingRoute(null);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [allRoutes]);

  const handleOpenRouteModal = (route: any) => {
    setViewingRoute(route);
    const id = route._id || route.id;
    if (id && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("viewRouteId", id);
      const newQuery = params.toString();
      const newUrl = `${window.location.pathname}?${newQuery}`;
      window.history.pushState(null, "", newUrl);
    }
  };

  const handleCloseRouteModal = () => {
    setViewingRoute(null);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.has("viewRouteId")) {
        params.delete("viewRouteId");
        const newQuery = params.toString();
        const newUrl = newQuery ? `${window.location.pathname}?${newQuery}` : window.location.pathname;
        window.history.pushState(null, "", newUrl);
      }
    }
  };

  const filtered = useMemo(() => {
    return allRoutes.filter((r) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (r.name || "").toLowerCase().includes(q);
    });
  }, [allRoutes, search]);

  const handleDelete = async (e: React.MouseEvent, routeId: string): Promise<boolean> => {
    if (e?.stopPropagation) e.stopPropagation();
    const confirmed = window.confirm(
      t("route_planner.confirm_delete_route") ||
        "¿Estás seguro de que deseas eliminar esta ruta?"
    );
    if (!confirmed) {
      return false;
    }

    try {
      await deleteRoutePlan(routeId).unwrap();
      toast.success(t("route_planner.route_deleted") || "Ruta eliminada con éxito");
      return true;
    } catch (err: any) {
      toast.error(err?.data?.message || "Error al eliminar la ruta");
      return false;
    }
  };

  const handleOpenGoogleMaps = (e: React.MouseEvent, stops: any[]) => {
    e.stopPropagation();
    const validStops = stops
      .filter((s: any) => s.place || s.business)
      .map((s: any) => {
        const loc = s.place || s.business;
        return (
          loc?.location?.coordinates ||
          loc?.location?.mapLocation?.coordinates || [0, 0]
        );
      })
      .filter((c: any) => c[1] && c[0]);

    if (validStops.length === 0) {
      toast.info(t("route_planner.no_coordinates") || "No hay coordenadas disponibles para esta ruta");
      return;
    }

    if (validStops.length === 1) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${validStops[0][1]},${validStops[0][0]}`,
        "_blank"
      );
      return;
    }

    const origin = `${validStops[0][1]},${validStops[0][0]}`;
    const destination = `${validStops[validStops.length - 1][1]},${
      validStops[validStops.length - 1][0]
    }`;
    const waypoints = validStops
      .slice(1, -1)
      .map((c: any) => `${c[1]},${c[0]}`)
      .join("|");

    const fullUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${
      waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""
    }`;
    window.open(fullUrl, "_blank");
  };

  if (!accessToken) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 font-public-sans text-center min-h-[calc(100vh-280px)] flex items-center justify-center">
        <div className="max-w-md w-full mx-auto bg-white dark:bg-[#131b2e] rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
          <Compass className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-4 text-[#FFC107] opacity-80" />
          <h2 className="text-xl font-black text-gray-950 dark:text-white mb-2">
            {t("route_planner.my_saved_routes") || "Mis Rutas Guardadas"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 leading-relaxed">
            {t("route_planner.login_to_view_routes") ||
              "Inicia sesión para ver y gestionar todas tus rutas personalizadas de roadtrip."}
          </p>
          <button
            type="button"
            onClick={() => openLoginRequired("/saved-routes", t("route_planner.my_saved_routes") || "Mis Rutas")}
            className="w-full py-3.5 rounded-2xl bg-[#FFC107] hover:bg-[#e6ad06] text-gray-950 font-bold text-sm shadow-md active:scale-98 transition-all"
          >
            {t("nav.login") || "Iniciar Sesión"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-8 sm:pb-12 font-public-sans min-h-[calc(100vh-280px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-slate-100 flex items-center gap-3">
            <span>{t("route_planner.saved_routes") || "Mis Rutas"}</span>
            <span className="text-xs sm:text-sm font-extrabold bg-amber-400/20 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full">
              {allRoutes.length}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
            {t("route_planner.profile_subtitle") ||
              "Planes de roadtrip y rutas personalizadas creadas por ti"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <CountryFilter filter={countryFilter} />
          {/* Search with Clear Button */}
          <div className="relative flex items-center border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-[#131b2e] w-full sm:w-64 shadow-sm">
            <Search className="text-gray-400 dark:text-slate-500 w-4 h-4 mr-2 shrink-0" />
            <Input
              placeholder={t("route_planner.search_saved_routes") || "Buscar mis rutas..."}
              className="border-none focus-visible:ring-0 w-full bg-transparent text-gray-900 dark:text-slate-100 placeholder:text-gray-400 text-sm p-0 h-auto"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-full"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <Link
            href="/route-planner?mode=create"
            className="px-4 py-2.5 rounded-xl bg-[#FFC107] hover:bg-[#e6ad06] text-gray-950 font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-1.5 flex-shrink-0 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t("route_planner.create_route_btn") || "Crear Ruta"}</span>
          </Link>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white dark:bg-[#131b2e] rounded-3xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm space-y-4 animate-pulse"
            >
              <div className="flex -space-x-3 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gray-200 dark:bg-slate-800" />
                <div className="w-14 h-14 rounded-2xl bg-gray-200 dark:bg-slate-800" />
              </div>
              <div className="h-5 w-3/4 bg-gray-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-1/2 bg-gray-200 dark:bg-slate-800 rounded" />
              <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-between">
                <div className="h-9 w-24 bg-gray-200 dark:bg-slate-800 rounded-xl" />
                <div className="h-9 w-24 bg-gray-200 dark:bg-slate-800 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-[#131b2e] rounded-3xl border border-dashed border-gray-200 dark:border-slate-800 p-8 max-w-lg mx-auto">
          {search ? (
            <>
              <Search className="w-12 h-12 mx-auto mb-3 text-amber-500 opacity-60" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                {language === "es"
                  ? `No se encontraron rutas con "${search}"`
                  : `No routes found matching "${search}"`}
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                {t("route_planner.try_different_filters") || "Intenta buscar con otro término."}
              </p>
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-4 px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-[#FFC107] text-gray-800 dark:text-slate-200 hover:text-gray-950 font-bold text-xs transition-colors"
              >
                {language === "es" ? "Limpiar búsqueda" : "Clear search"}
              </button>
            </>
          ) : (
            <>
              <Compass className="w-14 h-14 mx-auto mb-3 text-amber-500 opacity-60" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                {t("route_planner.no_saved_routes") || "Aún no tienes rutas guardadas"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {t("route_planner.saved_routes_helper") ||
                  "Organiza tus paradas favoritas de Puerto Rico en el planificador y guárdalas para encontrarlas aquí."}
              </p>
              <Link
                href="/route-planner?mode=create"
                className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-[#FFC107] hover:bg-[#e6ad06] text-gray-950 font-bold text-xs shadow-md transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{t("route_planner.create_first_route") || "Crear mi primer Roadtrip"}</span>
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((route: any) => {
            const routeId = route._id || route.id;
            const stopCount = Array.isArray(route.stops) ? route.stops.length : 0;
            const formattedDate = route.updatedAt
              ? new Date(route.updatedAt).toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "";

            // First 3 thumbnails
            const previewThumbnails = Array.isArray(route.stops)
              ? route.stops
                  .slice(0, 3)
                  .map((s: any) => {
                    const loc = s.place || s.business;
                    return getUsableMediaUrl(loc?.media?.photos || loc?.media);
                  })
                  .filter(Boolean)
              : [];

            // First & last stop names for journey preview
            const firstStop = Array.isArray(route.stops) && route.stops[0] ? (route.stops[0].place || route.stops[0].business) : null;
            const lastStop = Array.isArray(route.stops) && route.stops.length > 1 ? (route.stops[route.stops.length - 1].place || route.stops[route.stops.length - 1].business) : null;
            const firstStopName = firstStop?.name ? getLocalized(firstStop.name, language) : "";
            const lastStopName = lastStop?.name ? getLocalized(lastStop.name, language) : "";

            return (
              <div
                key={routeId}
                onClick={() => handleOpenRouteModal(route)}
                className="bg-white dark:bg-[#131b2e] rounded-3xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm hover:shadow-xl hover:border-amber-400/50 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  {/* Thumbnails collage header with +N counter */}
                  <div className="flex -space-x-3 overflow-hidden mb-4 items-center">
                    {previewThumbnails.length > 0 ? (
                      <>
                        {previewThumbnails.map((img: string, i: number) => (
                          <div
                            key={i}
                            className="relative w-14 h-14 rounded-2xl border-2 border-white dark:border-slate-800 overflow-hidden bg-gray-100 dark:bg-slate-800 shadow-sm shrink-0"
                          >
                            <SafeImage src={img} alt="" fill className="object-cover" />
                          </div>
                        ))}
                        {stopCount > 3 && (
                          <div className="relative w-14 h-14 rounded-2xl border-2 border-white dark:border-slate-800 bg-[#FFC107] text-gray-950 font-black text-xs flex items-center justify-center shadow-sm shrink-0">
                            +{stopCount - 3}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                        <MapPin className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg font-black text-gray-900 dark:text-slate-100 line-clamp-1 mb-1 group-hover:text-amber-500 transition-colors">
                    {route.name || "Ruta sin nombre"}
                  </h3>

                  {/* Journey path preview if at least 2 stops */}
                  {firstStopName && lastStopName && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium mb-2 truncate">
                      <Compass className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{firstStopName}</span>
                      <span>→</span>
                      <span className="truncate">{lastStopName}</span>
                    </div>
                  )}

                  {/* Optional route description */}
                  {route.description && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2 mb-3">
                      {route.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400 mb-5">
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {stopCount}{" "}
                      {stopCount === 1
                        ? (t("route_planner.stop_singular") || "parada")
                        : (t("route_planner.stop_plural") || "paradas")}
                    </span>
                    {formattedDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 opacity-60" />
                        {formattedDate}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between gap-2 pt-4 border-t border-gray-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      title={t("route_planner.navigate_tooltip") || "Navegar ruta en Google Maps"}
                      onClick={(e) => handleOpenGoogleMaps(e, route.stops)}
                      className="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-[#FFC107] text-gray-700 dark:text-slate-300 hover:text-gray-950 transition-colors"
                    >
                      <Navigation className="w-4 h-4 -rotate-45" />
                    </button>

                    <button
                      type="button"
                      title={t("route_planner.delete_tooltip") || "Eliminar ruta"}
                      onClick={(e) => handleDelete(e, routeId)}
                      className="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      title={t("route_planner.edit_route") || "Editar ruta"}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/route-planner?routeId=${routeId}&mode=edit`);
                      }}
                      className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-[#FFC107] text-amber-600 hover:text-gray-950 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenRouteModal(route)}
                    className="px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 group-hover:bg-[#FFC107] text-gray-900 dark:text-slate-100 group-hover:text-gray-950 font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    <span>{t("route_planner.view_route_btn") || "Ver ruta"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View-Only Route Details Modal */}
      <RouteDetailViewModal
        route={viewingRoute}
        isOpen={Boolean(viewingRoute)}
        onClose={handleCloseRouteModal}
        onEdit={(id) => {
          handleCloseRouteModal();
          router.push(`/route-planner?routeId=${id}&mode=edit`);
        }}
        onDelete={async (id) => {
          const success = await handleDelete({ stopPropagation: () => {} } as any, id);
          if (success) {
            handleCloseRouteModal();
          }
        }}
      />
    </section>
  );
}
