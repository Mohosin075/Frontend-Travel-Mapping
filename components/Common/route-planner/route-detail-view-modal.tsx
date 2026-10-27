"use client";

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  Navigation,
  Pencil,
  Trash2,
  Calendar,
  MapPin,
  ExternalLink,
  Compass,
} from "lucide-react";
import { SafeImage } from "@/components/shared/safe-image";
import { getLocalized, getUsableMediaUrl } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { toast } from "sonner";

interface RouteDetailViewModalProps {
  route: any | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (routeId: string) => void;
  onDelete?: (routeId: string) => void;
}

export default function RouteDetailViewModal({
  route,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: RouteDetailViewModalProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [selectedStopIndex, setSelectedStopIndex] = useState<number>(0);

  // Reset selected stop on route open
  useEffect(() => {
    if (isOpen) {
      setSelectedStopIndex(0);
    }
  }, [isOpen, route]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Extract valid [lng, lat] coordinates from place or business location
  const extractCoords = (loc: any): [number, number] => {
    if (!loc) return [0, 0];
    const rawCoords =
      loc.location?.coordinates ||
      loc.location?.mapLocation?.coordinates ||
      loc.coordinates;
    if (Array.isArray(rawCoords) && rawCoords.length >= 2) {
      const lng = Number(rawCoords[0]);
      const lat = Number(rawCoords[1]);
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        return [lng, lat];
      }
    }
    const lat = Number(loc.latitude ?? loc.location?.lat ?? loc.lat);
    const lng = Number(loc.longitude ?? loc.location?.lng ?? loc.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
      return [lng, lat];
    }
    return [0, 0];
  };

  const stops = useMemo(() => {
    if (!route || !Array.isArray(route.stops)) return [];
    return route.stops
      .filter((s: any) => s.place || s.business)
      .map((s: any, idx: number) => {
        const loc = s.place || s.business;
        return {
          id: s._id || `stop-${idx}`,
          placeId: loc._id || loc.id,
          name: loc.name,
          category: loc.category?.name || loc.category || "",
          address: loc.address || loc.location?.address || "",
          media: loc.media?.photos || loc.media || [],
          coordinates: extractCoords(loc),
          order: s.order || idx + 1,
        };
      });
  }, [route]);

  if (!isOpen || !route) return null;

  const routeId = route._id || route.id;
  const stopCount = stops.length;
  const formattedDate = route.updatedAt
    ? new Date(route.updatedAt).toLocaleDateString(
        language === "es" ? "es-ES" : "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        }
      )
    : "";

  const firstStopName = stops[0]?.name ? getLocalized(stops[0].name, language) : "";
  const lastStopName = stops[stops.length - 1]?.name
    ? getLocalized(stops[stops.length - 1].name, language)
    : "";

  const handleStopDirections = (coordinates: [number, number]) => {
    if (!coordinates || !coordinates[0] || !coordinates[1]) {
      toast.info(
        t("route_planner.no_coordinates") ||
          "No hay coordenadas disponibles para este lugar"
      );
      return;
    }
    const [lng, lat] = coordinates;
    const numLat = Number(lat);
    const numLng = Number(lng);
    if (!Number.isFinite(numLat) || !Number.isFinite(numLng) || (numLat === 0 && numLng === 0)) {
      toast.info(
        t("route_planner.no_coordinates") ||
          "No hay coordenadas disponibles para este lugar"
      );
      return;
    }
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${numLat},${numLng}`,
      "_blank"
    );
  };

  const handleOpenGoogleMaps = () => {
    const validCoords = stops
      .map((s: any) => s.coordinates)
      .filter((c: any) => Array.isArray(c) && c[0] && c[1]);

    if (validCoords.length === 0) {
      toast.info(
        t("route_planner.no_coordinates") ||
          "No hay coordenadas disponibles para esta ruta"
      );
      return;
    }

    if (validCoords.length === 1) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${validCoords[0][1]},${validCoords[0][0]}`,
        "_blank"
      );
      return;
    }

    const origin = `${validCoords[0][1]},${validCoords[0][0]}`;
    const destination = `${validCoords[validCoords.length - 1][1]},${
      validCoords[validCoords.length - 1][0]
    }`;
    const waypoints = validCoords
      .slice(1, -1)
      .map((c: any) => `${c[1]},${c[0]}`)
      .join("|");

    const fullUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${
      waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""
    }`;
    window.open(fullUrl, "_blank");
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 md:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-white dark:bg-[#131b2e] rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 sm:px-7 py-3.5 sm:py-4 border-b border-gray-100 dark:border-slate-800 flex items-start justify-between bg-white dark:bg-[#131b2e] shrink-0 gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider">
                {t("route_planner.view_mode") || "Modo Lectura"}
              </span>
              <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                {stopCount}{" "}
                {stopCount === 1
                  ? t("route_planner.stop_singular") || "parada"
                  : t("route_planner.stop_plural") || "paradas"}
              </span>
              {formattedDate && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
                  <Calendar className="w-3 h-3" />
                  {formattedDate}
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-2xl font-black text-gray-950 dark:text-white truncate">
              {route.name || "Ruta de Roadtrip"}
            </h2>

            {route.description && (
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">
                {route.description}
              </p>
            )}

            {firstStopName && lastStopName && stops.length > 1 && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1">
                <Compass className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[120px] sm:max-w-none">{firstStopName}</span>
                <span>→</span>
                <span className="truncate max-w-[120px] sm:max-w-none">{lastStopName}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content: Stops List */}
        <div className="flex-1 overflow-y-auto">
          {/* Stops List */}
          <div className="p-5 sm:p-7">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-500" />
                <span>{t("route_planner.stops_sequence") || "Secuencia de paradas"}</span>
              </h3>
            </div>

            {stops.length === 0 ? (
              <div className="py-12 text-center text-gray-400 dark:text-slate-500 text-sm">
                {t("route_planner.empty_route_desc") || "No se han agregado paradas a esta ruta."}
              </div>
            ) : (
              <div className="space-y-3">
                {stops.map((stop: any, index: number) => {
                  const photo = getUsableMediaUrl(stop.media);
                  const isSelected = selectedStopIndex === index;

                  return (
                    <div
                      key={stop.id || index}
                      onClick={() => setSelectedStopIndex(index)}
                      className={`flex items-center gap-3 sm:gap-3.5 p-2.5 sm:p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 group ${
                        isSelected
                          ? "border-[#FFC107] bg-amber-500/10 dark:bg-amber-500/15 ring-2 ring-[#FFC107]/40 shadow-sm"
                          : "border-gray-100 dark:border-slate-800/80 bg-gray-50/60 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800/60 hover:border-amber-300 dark:hover:border-slate-700"
                      }`}
                    >
                      {/* Step Number Badge (Desktop) */}
                      <div
                        className={`hidden sm:flex w-8 h-8 rounded-full font-black text-xs items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? "bg-[#FFC107] text-gray-950 shadow-md scale-105"
                            : "bg-amber-400/20 text-amber-700 dark:text-amber-400 group-hover:bg-amber-400/30"
                        }`}
                      >
                        {index + 1}
                      </div>

                      {/* Photo Thumbnail */}
                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 shrink-0">
                        {photo ? (
                          <SafeImage
                            src={photo}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-amber-500 bg-amber-500/10">
                            <MapPin className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      {/* Stop Info (Name & Address) */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-amber-500 transition-colors break-words">
                            {getLocalized(stop.name, language)}
                          </h4>
                          {isSelected && (
                            <span className="hidden sm:inline-flex text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#FFC107] text-gray-950 shrink-0">
                              {t("route_planner.active_badge") || "Activo"}
                            </span>
                          )}
                        </div>
                        {stop.address && (
                          <p className="text-[11px] sm:text-xs text-gray-500 dark:text-slate-400 line-clamp-1 truncate mt-0.5">
                            {stop.address}
                          </p>
                        )}
                      </div>

                      {/* Action button: Get directions */}
                      <div className="shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStopDirections(stop.coordinates);
                          }}
                          title={t("route_planner.directions") || (language === "es" ? "Cómo llegar" : "Get directions")}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[#FFC107] hover:bg-[#e6ad06] text-gray-950 font-bold text-xs shadow-sm active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                        >
                          <Navigation className="w-3.5 h-3.5 fill-gray-950 -rotate-45 shrink-0" />
                          <span>{t("route_planner.directions") || (language === "es" ? "Cómo llegar" : "Get directions")}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-7 py-3 sm:py-3.5 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Open Google Maps Button */}
            <button
              type="button"
              onClick={handleOpenGoogleMaps}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-amber-400 text-gray-800 dark:text-slate-200 font-bold text-xs sm:text-sm shadow-sm transition-all"
            >
              <Navigation className="w-4 h-4 text-amber-500 -rotate-45 shrink-0" />
              <span className="truncate">{t("route_planner.navigate_google_maps") || "Navegar en Google Maps"}</span>
            </button>

            {/* Delete Route */}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(routeId)}
                title={t("route_planner.delete_tooltip") || "Eliminar ruta"}
                className="p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-500 hover:text-red-600 transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Edit Route Button */}
          <button
            type="button"
            onClick={() => onEdit(routeId)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFC107] hover:bg-[#e6ad06] text-gray-950 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 w-full sm:w-auto"
          >
            <Pencil className="w-4 h-4 shrink-0" />
            <span>{t("route_planner.edit_route") || "Modificar Ruta"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
