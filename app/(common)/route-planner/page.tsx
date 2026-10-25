"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  GripVertical,
  Navigation,
  Plus,
  Trash2,
  Bookmark,
  Pencil,
  X,
  MoreVertical,
  MapPin,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Compass,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { SafeImage } from "@/components/shared/safe-image";
import { getUsableMediaUrl, getLocalized } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  useCreateRoutePlanMutation,
  useGetMyRoutePlansQuery,
  useUpdateRoutePlanMutation,
} from "@/redux/features/route-plan/routePlanApi";
import AddStopModal from "@/components/Common/route-planner/add-stop-modal";
import SavedRoutesModal from "@/components/Common/route-planner/saved-routes-modal";
import SavedRoutes from "@/components/Common/profile/saved-routes/saved-routes";
import { toast } from "sonner";
import { useLoginRequired } from "@/components/shared/login-required-modal";
import { useAppSelector } from "@/redux/hook";
import { selectAccessToken } from "@/redux/features/auth/authSlice";
import { APIProvider } from "@vis.gl/react-google-maps";

const LOCAL_STORAGE_KEY = "roadtripeado_draft_route";

interface RouteStopItem {
  id: string;
  placeId: string;
  name: any;
  address: string;
  media: string[];
  coordinates: [number, number]; // [lng, lat]
  order: number;
}

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

export function RoutePlannerInner() {
  const { t, language } = useLanguage();
  const { openLoginRequired } = useLoginRequired();
  const accessToken = useAppSelector(selectAccessToken);
  const searchParams = useSearchParams();
  const routeIdParam = searchParams.get("routeId");
  const modeParam = searchParams.get("mode");

  const [routeName, setRouteName] = useState("Road Trip por Área Metro");
  const [stops, setStops] = useState<RouteStopItem[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSavedRoutesModalOpen, setIsSavedRoutesModalOpen] = useState(false);
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [highlightedStopIndex, setHighlightedStopIndex] = useState<number | null>(null);
  const [, setIsLoadedFromCache] = useState(false);

  // Guards against race conditions and unintended overwrites
  const hasInitializedRef = useRef(false);

  const { data: myRoutesRes, isLoading: isLoadingRoutes } = useGetMyRoutePlansQuery(
    { limit: 100 },
    { skip: !accessToken }
  );
  const [createRoutePlan, { isLoading: isSaving }] = useCreateRoutePlanMutation();
  const [updateRoutePlan, { isLoading: isUpdating }] = useUpdateRoutePlanMutation();

  // 1. Initial Load: Check modeParam/create, routeIdParam, localStorage
  useEffect(() => {
    if (modeParam === "create" || modeParam === "new") {
      setSelectedRouteId(null);
      setRouteName(language === "es" ? "Nueva Ruta de Roadtrip" : "New Roadtrip Route");
      setStops([]);
      hasInitializedRef.current = true;
      return;
    }

    const savedRoutes = myRoutesRes?.data?.data || myRoutesRes?.data || [];

    // If specific routeId is passed in URL query parameter, load that route immediately
    if (routeIdParam && savedRoutes.length > 0) {
      const targetRoute = savedRoutes.find((r: any) => (r._id || r.id) === routeIdParam);
      if (targetRoute) {
        setSelectedRouteId(targetRoute._id || targetRoute.id);
        setRouteName(targetRoute.name || "Mi Roadtrip");
        if (Array.isArray(targetRoute.stops)) {
          const loadedStops: RouteStopItem[] = targetRoute.stops
            .filter((s: any) => s.place || s.business)
            .map((s: any, idx: number) => {
              const loc = s.place || s.business;
              return {
                id: s._id || `stop-${idx}`,
                placeId: loc._id || loc.id,
                name: loc.name,
                address: loc.address || loc.location?.address || "",
                media: loc.media?.photos || loc.media || [],
                coordinates: extractCoords(loc),
                order: s.order || idx + 1,
              };
            });
          setStops(loadedStops);
        }
        hasInitializedRef.current = true;
        return;
      }
    }

    if (hasInitializedRef.current) return;

    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.stops && Array.isArray(parsed.stops) && parsed.stops.length > 0) {
          setStops(parsed.stops);
          if (parsed.name) setRouteName(parsed.name);
          if (parsed.routeId) setSelectedRouteId(parsed.routeId);
          setIsLoadedFromCache(true);
          hasInitializedRef.current = true;
          return;
        }
      }
    } catch {
      // Ignore parse errors
    }

    // Fallback: If no local cache, check server routes
    if (savedRoutes.length > 0) {
      const firstRoute = savedRoutes[0];
      setSelectedRouteId(firstRoute._id);
      setRouteName(firstRoute.name || "Mi Roadtrip");

      if (Array.isArray(firstRoute.stops)) {
        const loadedStops: RouteStopItem[] = firstRoute.stops
          .filter((s: any) => s.place || s.business)
          .map((s: any, idx: number) => {
            const loc = s.place || s.business;
            return {
              id: s._id || `stop-${idx}`,
              placeId: loc._id || loc.id,
              name: loc.name,
              address: loc.address || loc.location?.address || "",
              media: loc.media?.photos || loc.media || [],
              coordinates: extractCoords(loc),
              order: s.order || idx + 1,
            };
          });
        setStops(loadedStops);
      }
      hasInitializedRef.current = true;
      return;
    }

    if (!isLoadingRoutes) {
      hasInitializedRef.current = true;
    }
  }, [myRoutesRes, isLoadingRoutes, routeIdParam]);

  // 2. Persist to LocalStorage whenever routeName or stops change (only AFTER initialization!)
  useEffect(() => {
    if (!hasInitializedRef.current) return;

    try {
      if (stops.length > 0) {
        const draft = {
          name: routeName,
          stops,
          routeId: selectedRouteId,
          lastUpdated: Date.now(),
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(draft));
        setIsLoadedFromCache(true);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setIsLoadedFromCache(false);
      }
    } catch {
      // Ignore quota errors
    }
  }, [stops, routeName, selectedRouteId]);

  useEffect(() => {
    const handleSyncFromDraft = () => {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed?.stops)) {
            setStops(parsed.stops);
            if (parsed.name) setRouteName(parsed.name);
            if (parsed.routeId !== undefined) setSelectedRouteId(parsed.routeId);
            setIsLoadedFromCache(true);
          }
        }
      } catch {}
    };

    window.addEventListener("roadtripeado_route_draft_changed", handleSyncFromDraft);
    window.addEventListener("storage", handleSyncFromDraft);
    return () => {
      window.removeEventListener("roadtripeado_route_draft_changed", handleSyncFromDraft);
      window.removeEventListener("storage", handleSyncFromDraft);
    };
  }, []);

  // Handle adding place
  const handleAddPlace = (place: any) => {
    if (place.isLocked) {
      toast.error(
        language === "es"
          ? "Esta atracción turística requiere la compra del mapa para añadirse a la ruta."
          : "This tourist attraction requires map purchase to be added to your route."
      );
      return;
    }

    const placeId = place._id || place.id;
    const exists = stops.some((s) => s.placeId === placeId);
    if (exists) {
      toast.info(t("route_planner.already_in_route") || "Este lugar ya está en tu ruta");
      return;
    }

    let coordinates: [number, number] = [0, 0];
    if (Array.isArray(place.location?.coordinates) && place.location.coordinates.length === 2) {
      coordinates = [Number(place.location.coordinates[0]), Number(place.location.coordinates[1])];
    } else if (Array.isArray(place.location?.mapLocation?.coordinates) && place.location.mapLocation.coordinates.length === 2) {
      coordinates = [Number(place.location.mapLocation.coordinates[0]), Number(place.location.mapLocation.coordinates[1])];
    } else if (Array.isArray(place.coordinates) && place.coordinates.length === 2) {
      coordinates = [Number(place.coordinates[0]), Number(place.coordinates[1])];
    } else if (place.longitude && place.latitude) {
      coordinates = [Number(place.longitude), Number(place.latitude)];
    } else if (place.lng && place.lat) {
      coordinates = [Number(place.lng), Number(place.lat)];
    }

    const newStop: RouteStopItem = {
      id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      placeId,
      name: place.name,
      address: place.address || place.location?.address || place.location?.city || "",
      media: place.media?.photos || place.media || [],
      coordinates,
      order: stops.length + 1,
    };

    setStops((prev) => [...prev, newStop]);
    toast.success(t("route_planner.stop_added") || "Parada añadida");
  };

  // Reorder stops
  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updated = [...stops];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    const reordered = updated.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

    setStops(reordered);
    setDraggedIndex(null);
  };

  const handleMoveStop = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stops.length) return;

    const updated = [...stops];
    const [movedItem] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, movedItem);

    const reordered = updated.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

    setStops(reordered);
    setActiveMenuIndex(null);
  };

  const handleRemoveStop = (index: number) => {
    const updated = stops
      .filter((_, idx) => idx !== index)
      .map((item, idx) => ({ ...item, order: idx + 1 }));
    setStops(updated);
    setActiveMenuIndex(null);
    toast.info(t("route_planner.stop_removed") || "Parada eliminada");
  };

  const handleClearRoute = () => {
    if (stops.length === 0) return;
    if (
      window.confirm(
        t("route_planner.confirm_clear") ||
          "¿Estás seguro de que deseas limpiar todas las paradas?"
      )
    ) {
      setStops([]);
      setSelectedRouteId(null);
      setIsLoadedFromCache(false);
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {}
      toast.info(t("route_planner.route_cleared") || "Ruta limpiada");
    }
  };

  // Single stop directions
  const handleDirections = (coordinates: [number, number]) => {
    if (!coordinates) {
      toast.error(t("route_planner.no_coordinates") || "Coordenadas no disponibles");
      return;
    }
    const [lng, lat] = coordinates;
    const numLat = Number(lat);
    const numLng = Number(lng);
    if (!Number.isFinite(numLat) || !Number.isFinite(numLng) || (numLat === 0 && numLng === 0)) {
      toast.error(t("route_planner.no_coordinates") || "Coordenadas no disponibles");
      return;
    }
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${numLat},${numLng}`, "_blank");
  };

  // Select a route from SavedRoutesModal
  const handleSelectRoute = (route: any) => {
    if (!route) return;
    const rId = route._id || route.id;
    setSelectedRouteId(rId);
    setRouteName(route.name || "Mi Roadtrip");
    if (Array.isArray(route.stops)) {
      const loadedStops: RouteStopItem[] = route.stops
        .filter((s: any) => s.place || s.business)
        .map((s: any, idx: number) => {
          const loc = s.place || s.business;
          return {
            id: s._id || `stop-${idx}`,
            placeId: loc._id || loc.id,
            name: loc.name,
            address: loc.address || loc.location?.address || "",
            media: loc.media?.photos || loc.media || [],
            coordinates: extractCoords(loc),
            order: s.order || idx + 1,
          };
        });
      setStops(loadedStops);
    } else {
      setStops([]);
    }
    setIsSavedRoutesModalOpen(false);
    toast.success(
      language === "en"
        ? `Route "${route.name}" loaded`
        : `Ruta "${route.name}" cargada`
    );
  };

  // Start fresh new route
  const handleNewRoute = () => {
    setSelectedRouteId(null);
    setRouteName(language === "en" ? "Road Trip around Puerto Rico" : "Road Trip por Puerto Rico");
    setStops([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {}
    setIsLoadedFromCache(false);
    setIsSavedRoutesModalOpen(false);
    toast.info(t("route_planner.starting_new_route") || "Iniciando una nueva ruta en blanco");
  };

  // Navigate Full Roadtrip with all waypoints
  const handleNavigateFullRoute = () => {
    const validStops = stops.filter(
      (s) =>
        s.coordinates &&
        Number.isFinite(Number(s.coordinates[1])) &&
        Number.isFinite(Number(s.coordinates[0])) &&
        Number(s.coordinates[1]) !== 0 &&
        Number(s.coordinates[0]) !== 0
    );

    if (validStops.length < 2) {
      if (validStops.length === 1) {
        handleDirections(validStops[0].coordinates);
      } else {
        toast.info(t("route_planner.need_two_stops") || "Añade al menos dos paradas para generar la ruta completa");
      }
      return;
    }

    const origin = `${validStops[0].coordinates[1]},${validStops[0].coordinates[0]}`;
    const destination = `${validStops[validStops.length - 1].coordinates[1]},${validStops[validStops.length - 1].coordinates[0]}`;
    const waypoints = validStops
      .slice(1, -1)
      .map((s) => `${s.coordinates[1]},${s.coordinates[0]}`)
      .join("|");

    const fullUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${
      waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""
    }`;
    window.open(fullUrl, "_blank");
  };

  // Save or Update Route
  const handleSaveRoute = async () => {
    if (!accessToken) {
      openLoginRequired("/route-planner", t("route_planner.save_route") || "Guardar ruta");
      return;
    }

    if (!routeName.trim()) {
      toast.error(t("route_planner.name_required") || "Por favor ingresa un nombre para la ruta");
      return;
    }

    if (stops.length === 0) {
      toast.error(t("route_planner.no_stops") || "Añade al menos una parada antes de guardar");
      return;
    }

    const payload = {
      name: routeName.trim(),
      stops: stops.map((s, idx) => ({
        place: s.placeId,
        order: idx + 1,
      })),
    };

    try {
      if (selectedRouteId) {
        await updateRoutePlan({ id: selectedRouteId, data: payload }).unwrap();
        toast.success(t("route_planner.updated_success") || "¡Ruta actualizada con éxito!");
      } else {
        const res = await createRoutePlan(payload).unwrap();
        const createdId = res?.data?._id || res?.data?.id;
        if (createdId) setSelectedRouteId(createdId);
        toast.success(t("route_planner.saved_success") || "¡Ruta guardada con éxito!");
      }
    } catch (err: any) {
      toast.error(
        err?.data?.message ||
          t("route_planner.save_error") ||
          "Error al guardar la ruta"
      );
    }
  };

  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY ||
    "AIzaSyC99c2erPRrFhfkTCsfSAGnVzNR7u4BNCU";

  if (!routeIdParam && modeParam !== "create" && modeParam !== "new" && modeParam !== "edit") {
    return <SavedRoutes />;
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className="min-h-screen bg-slate-50/70 dark:bg-[#0b0f19] text-gray-900 dark:text-slate-100 pb-28 sm:pb-20 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
          {/* Page Title & Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-200/70 dark:border-slate-800/80 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-[11px] uppercase tracking-wider">
                  Roadtrip Planner
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                {t("route_planner.title") || "Planificador de Roadtrip"}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                {t("route_planner.subtitle") || "Organiza tus paradas, cambia el orden arrastrando y crea la ruta perfecta."}
              </p>
            </div>

          </div>

          {/* Dedicated Route Planner Container */}
          <div className="max-w-3xl mx-auto space-y-4 sm:space-y-5">
              {/* Route Name Input Card */}
              <div className="bg-white dark:bg-[#131b2e] rounded-3xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-slate-800/80 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-900 dark:text-slate-200">
                    {t("route_planner.route_name_label") || "Nombre de la ruta"}
                  </label>
                </div>
                <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl border border-gray-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 focus-within:border-[#FFC107] focus-within:ring-2 focus-within:ring-[#FFC107]/20 transition-all">
                  <Pencil className="w-4 h-4 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                  <input
                    type="text"
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                    placeholder={
                      t("route_planner.placeholder_route_name") ||
                      "Ej. Road Trip por Área Metro"
                    }
                    className="w-full text-sm font-semibold bg-transparent border-none focus:outline-none text-gray-900 dark:text-slate-100 placeholder:text-gray-400"
                  />
                  {routeName && (
                    <button
                      type="button"
                      onClick={() => setRouteName("")}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>


              </div>



              {/* Stops List */}
              <div className="space-y-3">
                {stops.length === 0 ? (
                  <div className="p-8 sm:p-10 text-center bg-white dark:bg-[#131b2e] rounded-3xl border border-dashed border-gray-200 dark:border-slate-800">
                    <div className="w-14 h-14 rounded-full bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center text-amber-500 mx-auto mb-3">
                      <Compass className="w-7 h-7 animate-spin-slow" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
                      {t("route_planner.empty_title") || "No hay paradas en tu ruta"}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                      {t("route_planner.empty_desc") ||
                        "Empieza agregando tus lugares favoritos de Puerto Rico para planificar tu viaje."}
                    </p>
                  </div>
                ) : (
                  stops.map((stop, index) => {
                    const coverImage = getUsableMediaUrl(stop.media);
                    const displayName = getLocalized(stop.name, language);
                    const isMenuOpen = activeMenuIndex === index;
                    const isHighlighted = highlightedStopIndex === index;

                    return (
                      <div
                        key={stop.id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e)}
                        onDrop={() => handleDrop(index)}
                        onMouseEnter={() => setHighlightedStopIndex(index)}
                        onMouseLeave={() => setHighlightedStopIndex(null)}
                        className={`relative flex items-center gap-3 p-3 bg-white dark:bg-[#131b2e] rounded-2xl border shadow-sm transition-all ${
                          isHighlighted
                            ? "border-[#FFC107] ring-2 ring-[#FFC107]/20 shadow-md"
                            : "border-gray-100 dark:border-slate-800 hover:border-gray-300"
                        } ${
                          draggedIndex === index
                            ? "opacity-40 border-[#FFC107] scale-98"
                            : ""
                        }`}
                      >
                        {/* Drag Handle & Mobile Touch Quick Reorder Buttons */}
                        <div className="flex flex-col items-center justify-center flex-shrink-0 -my-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveStop(index, "up");
                            }}
                            title={t("route_planner.move_up") || "Mover arriba"}
                            className="p-1 text-gray-400 hover:text-[#FFC107] disabled:opacity-20 disabled:pointer-events-none transition-colors"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <div
                            title={
                              t("route_planner.drag_tooltip") ||
                              "Arrastra para reordenar"
                            }
                            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-700 dark:text-slate-500 p-0.5"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <button
                            type="button"
                            disabled={index === stops.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveStop(index, "down");
                            }}
                            title={t("route_planner.move_down") || "Mover abajo"}
                            className="p-1 text-gray-400 hover:text-[#FFC107] disabled:opacity-20 disabled:pointer-events-none transition-colors"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Thumbnail Image + Number Badge */}
                        {stop.placeId ? (
                          <Link
                            href={`/places/${stop.placeId}`}
                            onClick={(e) => e.stopPropagation()}
                            title={displayName}
                            className="relative w-18 h-18 sm:w-24 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-slate-800 block hover:opacity-90 transition-opacity"
                          >
                            {coverImage ? (
                              <SafeImage
                                src={coverImage}
                                alt={displayName}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-[10px] font-bold">
                                <MapPin className="w-4 h-4 mb-0.5 opacity-40" />
                                <span>Foto</span>
                              </div>
                            )}

                            {/* Yellow Number Badge */}
                            <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-[#FFC107] text-gray-950 font-black text-xs flex items-center justify-center shadow-md">
                              {index + 1}
                            </div>
                          </Link>
                        ) : (
                          <div className="relative w-18 h-18 sm:w-24 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-slate-800">
                            {coverImage ? (
                              <SafeImage
                                src={coverImage}
                                alt={displayName}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-[10px] font-bold">
                                <MapPin className="w-4 h-4 mb-0.5 opacity-40" />
                                <span>Foto</span>
                              </div>
                            )}

                            {/* Yellow Number Badge */}
                            <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-[#FFC107] text-gray-950 font-black text-xs flex items-center justify-center shadow-md">
                              {index + 1}
                            </div>
                          </div>
                        )}

                        {/* Place Info & Actions */}
                        <div className="flex-1 min-w-0 pr-1 flex flex-col justify-between self-stretch py-0.5">
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0 pr-2">
                              {stop.placeId ? (
                                <Link
                                  href={`/places/${stop.placeId}`}
                                  onClick={(e) => e.stopPropagation()}
                                  title={displayName}
                                  className="text-sm font-bold text-gray-900 dark:text-slate-100 hover:text-amber-500 hover:underline underline-offset-2 transition-colors truncate leading-snug block"
                                >
                                  {displayName}
                                </Link>
                              ) : (
                                <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate leading-snug">
                                  {displayName}
                                </h4>
                              )}
                              {stop.address && (
                                <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                                  <span className="truncate">{stop.address}</span>
                                </p>
                              )}
                            </div>

                            {/* 3-dots Menu Button */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveMenuIndex(isMenuOpen ? null : index)
                                }
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {/* Dropdown Menu */}
                              {isMenuOpen && (
                                <div className="absolute right-0 top-8 z-30 w-44 bg-white dark:bg-[#1a2438] rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 py-1.5 text-xs font-semibold">
                                  {index > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleMoveStop(index, "up")}
                                      className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                      {t("route_planner.move_up") || "Mover arriba"}
                                    </button>
                                  )}
                                  {index < stops.length - 1 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleMoveStop(index, "down")
                                      }
                                      className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                      {t("route_planner.move_down") ||
                                        "Mover abajo"}
                                    </button>
                                  )}
                                  <Link
                                    href={`/places/${stop.placeId}`}
                                    className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    {t("route_planner.view_place") || "Ver lugar"}
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveStop(index)}
                                    className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    {t("route_planner.delete_stop") ||
                                      "Eliminar parada"}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* "Cómo llegar" Yellow Button */}
                          <div className="flex justify-end mt-2">
                            <button
                              type="button"
                              onClick={() => handleDirections(stop.coordinates)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFC107] hover:bg-[#e6ad06] text-gray-950 font-bold text-xs shadow-sm active:scale-95 transition-all"
                            >
                              <Navigation className="w-3.5 h-3.5 fill-gray-950 -rotate-45" />
                              <span>
                                {t("route_planner.directions") || "Cómo llegar"}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* "+ Añadir parada" Button */}
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="w-full py-4 px-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] hover:border-[#FFC107] hover:bg-amber-50/40 dark:hover:bg-amber-950/10 text-gray-900 dark:text-slate-100 font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <span>{t("route_planner.add_stop_btn") || "Añadir parada"}</span>
              </button>

              {/* Bottom Actions Bar */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClearRoute}
                  disabled={stops.length === 0}
                  className="py-3.5 px-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#131b2e] hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-800 dark:text-slate-200 font-bold text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  <Trash2 className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                  <span>{t("route_planner.clear_route") || "Limpiar ruta"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveRoute}
                  disabled={isSaving || isUpdating}
                  className="py-3.5 px-4 rounded-2xl bg-[#FFC107] hover:bg-[#e6ad06] text-gray-950 font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 disabled:opacity-60 transition-all"
                >
                  <Bookmark className="w-4 h-4 fill-gray-950" />
                  <span>
                    {isSaving || isUpdating
                      ? t("common.saving") || "Guardando..."
                      : t("route_planner.save_route") || "Guardar ruta"}
                  </span>
                </button>
              </div>
          </div>
        </div>

        {/* Place Selector Modal */}
        <AddStopModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSelectPlace={handleAddPlace}
          selectedPlaceIds={stops.map((s) => s.placeId)}
        />

        {/* Saved Routes Modal */}
        <SavedRoutesModal
          isOpen={isSavedRoutesModalOpen}
          onClose={() => setIsSavedRoutesModalOpen(false)}
          onSelectRoute={handleSelectRoute}
          currentRouteId={selectedRouteId}
          onNewRoute={handleNewRoute}
        />
      </div>
    </APIProvider>
  );
}

export default function RoutePlannerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50/70 dark:bg-[#0b0f19]">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      }
    >
      <RoutePlannerInner />
    </Suspense>
  );
}
