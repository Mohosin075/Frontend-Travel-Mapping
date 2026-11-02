"use client";

import { X, Navigation, Trash2, Calendar, MapPin, ArrowRight, Compass, Plus } from "lucide-react";
import {
  useGetMyRoutePlansQuery,
  useDeleteRoutePlanMutation,
} from "@/redux/features/route-plan/routePlanApi";
import { SafeImage } from "@/components/shared/safe-image";
import { getUsableMediaUrl } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { toast } from "sonner";

interface SavedRoutesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRoute: (route: any) => void;
  currentRouteId?: string | null;
  onNewRoute: () => void;
}

export default function SavedRoutesModal({
  isOpen,
  onClose,
  onSelectRoute,
  currentRouteId,
  onNewRoute,
}: SavedRoutesModalProps) {
  const { t, language } = useLanguage();
  const { data: myRoutesRes, isLoading } = useGetMyRoutePlansQuery(
    { limit: 100 },
    {
      skip: !isOpen,
    }
  );
  const [deleteRoutePlan] = useDeleteRoutePlanMutation();

  if (!isOpen) return null;

  const routes = myRoutesRes?.data?.data || myRoutesRes?.data || [];

  const handleDelete = async (e: React.MouseEvent, routeId: string) => {
    e.stopPropagation();
    if (window.confirm(t("route_planner.confirm_delete_route") || "¿Estás seguro de que deseas eliminar esta ruta?")) {
      try {
        await deleteRoutePlan(routeId).unwrap();
        toast.success(t("route_planner.route_deleted") || "Ruta eliminada con éxito");
        if (routeId === currentRouteId) {
          onNewRoute();
        }
      } catch (err: any) {
        toast.error(err?.data?.message || "Error al eliminar la ruta");
      }
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

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-5 pt-16 sm:pt-20 bg-black/65 backdrop-blur-md transition-opacity animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#131b2e] rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#131b2e]">
          <div>
            <h3 className="text-base sm:text-xl font-black text-gray-950 dark:text-white">
              {t("route_planner.my_saved_routes") || "Mis Rutas Guardadas"}
            </h3>
            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              {routes.length}{" "}
              {routes.length === 1
                ? (t("route_planner.route_singular") || "ruta guardada")
                : (t("route_planner.route_plural") || "rutas guardadas")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onNewRoute();
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t("route_planner.new_route") || "Nueva ruta"}</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 space-y-3">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <div className="w-9 h-9 border-3 border-[#FFC107] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                {t("common.loading") || "Cargando tus rutas..."}
              </p>
            </div>
          ) : routes.length === 0 ? (
            <div className="py-16 text-center text-gray-400 dark:text-slate-500">
              <Compass className="w-12 h-12 mx-auto mb-2 opacity-40 text-amber-500" />
              <h4 className="text-base font-bold text-gray-800 dark:text-slate-200">
                {t("route_planner.no_saved_routes") || "No tienes rutas guardadas"}
              </h4>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                {t("route_planner.saved_routes_helper") ||
                  "Crea una ruta en el planificador y haz clic en \"Guardar ruta\" para verla aquí."}
              </p>
              <button
                type="button"
                onClick={() => {
                  onNewRoute();
                  onClose();
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-[#FFC107] text-gray-950 font-bold text-xs shadow-sm hover:bg-[#e6ad06]"
              >
                {t("route_planner.create_first_route") || "Crear mi primera ruta"}
              </button>
            </div>
          ) : (
            routes.map((route: any) => {
              const routeId = route._id || route.id;
              const isCurrent = currentRouteId === routeId;
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

              return (
                <div
                  key={routeId}
                  onClick={() => {
                    onSelectRoute(route);
                    onClose();
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCurrent
                      ? "bg-amber-50/80 dark:bg-amber-950/20 border-[#FFC107] ring-1 ring-[#FFC107]/40 shadow-sm"
                      : "bg-white dark:bg-[#182234] border-gray-100 dark:border-slate-800 hover:border-[#FFC107]/50 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Thumbnail previews */}
                    <div className="flex -space-x-3 overflow-hidden flex-shrink-0">
                      {previewThumbnails.length > 0 ? (
                        previewThumbnails.map((img: string, i: number) => (
                          <div
                            key={i}
                            className="relative w-12 h-12 rounded-xl border-2 border-white dark:border-slate-800 overflow-hidden bg-gray-100"
                          >
                            <SafeImage src={img} alt="" fill className="object-cover" />
                          </div>
                        ))
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs">
                          <MapPin className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">
                          {route.name || "Ruta sin nombre"}
                        </h4>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-[#FFC107] text-gray-950 text-[10px] font-extrabold flex-shrink-0">
                            {t("route_planner.active_route") || "Activa"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400 mt-1">
                        <span>
                          {stopCount}{" "}
                          {stopCount === 1
                            ? (t("route_planner.stop_singular") || "parada")
                            : (t("route_planner.stop_plural") || "paradas")}
                        </span>
                        {formattedDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 opacity-60" />
                            {formattedDate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-slate-800">
                    <button
                      type="button"
                      title={t("route_planner.navigate_tooltip") || "Navegar en Google Maps"}
                      onClick={(e) => handleOpenGoogleMaps(e, route.stops)}
                      className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-[#FFC107] text-gray-700 dark:text-slate-300 hover:text-gray-950 transition-colors"
                    >
                      <Navigation className="w-4 h-4 -rotate-45" />
                    </button>

                    <button
                      type="button"
                      title={t("route_planner.delete_tooltip") || "Eliminar ruta"}
                      onClick={(e) => handleDelete(e, routeId)}
                      className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-xl bg-[#FFC107] hover:bg-[#e6ad06] text-gray-950 font-bold text-xs shadow-sm flex items-center gap-1 transition-all"
                    >
                      <span>{t("route_planner.load_route") || "Cargar"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
