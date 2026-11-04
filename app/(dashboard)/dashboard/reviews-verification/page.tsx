"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useGetPendingReviewsQuery,
  useApproveReviewMutation,
  useRejectReviewMutation,
} from "@/redux/features/review/reviewApi";
import {
  useGetPlacesQuery,
  useReviewRecommendedPlaceMutation,
} from "@/redux/features/place/placeApi";
import { getImageUrl, getProfileImageUrl } from "@/lib/utils";
import {
  Check,
  X,
  Star,
  Sparkles,
  MapPin,
  MessageSquare,
  Eye,
  ExternalLink,
  ShieldCheck,
  Search,
  LayoutGrid,
  LayoutList,
  RefreshCw,
  Copy,
  CheckCheck,
  AlertTriangle,
  Compass,
  CheckCircle2,
  Building2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { appAlert } from "@/lib/app-alert";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ViewPlaceModal } from "@/components/dashboard/places/view-place-modal";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const getSafeString = (val: any, lang: string = "es"): string => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    return val[lang] || val.es || val.en || Object.values(val)[0] || "";
  }
  return String(val);
};

export default function ReviewsVerificationPage() {
  const { language } = useLanguage();
  const isEs = language === "es";

  // Active Tab: 'spots' (Tourist Spots) | 'reviews' (User Reviews)
  const [activeTab, setActiveTab] = useState<"spots" | "reviews">("spots");
  // Display mode: 'grid' | 'table'
  const [displayMode, setDisplayMode] = useState<"grid" | "table">("grid");
  // Search Query
  const [searchQuery, setSearchQuery] = useState("");

  // Rejection modal state for spots
  const [rejectSpotTarget, setRejectSpotTarget] = useState<any>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");

  // Place full details modal
  const [modalPlaceId, setModalPlaceId] = useState<string | null>(null);
  const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false);

  // Copied coordinates state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Queries
  const {
    data: reviewsResp,
    isLoading: isReviewsLoading,
    refetch: refetchReviews,
  } = useGetPendingReviewsQuery({});
  const [approveReview, { isLoading: isApprovingReview }] =
    useApproveReviewMutation();
  const [rejectReview, { isLoading: isRejectingReview }] =
    useRejectReviewMutation();

  const {
    data: pendingPlacesResp,
    isLoading: isPlacesLoading,
    refetch: refetchPlaces,
  } = useGetPlacesQuery({
    status: "Pending",
    limit: 100,
  });
  const [reviewRecommendedPlace, { isLoading: isReviewingPlace }] =
    useReviewRecommendedPlaceMutation();

  const pendingSpotsList: any[] = pendingPlacesResp?.data || [];
  const pendingReviewsList: any[] = reviewsResp?.data || [];

  // Filtered spots based on search
  const filteredSpots = useMemo(() => {
    if (!searchQuery.trim()) return pendingSpotsList;
    const q = searchQuery.toLowerCase().trim();
    return pendingSpotsList.filter((s) => {
      const name = getSafeString(s.name, language).toLowerCase();
      const addr = (s.address || "").toLowerCase();
      const user = (
        s.discoveredByName ||
        s.discoveredBy?.name ||
        ""
      ).toLowerCase();
      return name.includes(q) || addr.includes(q) || user.includes(q);
    });
  }, [pendingSpotsList, searchQuery, language]);

  // Filtered reviews based on search
  const filteredReviews = useMemo(() => {
    if (!searchQuery.trim()) return pendingReviewsList;
    const q = searchQuery.toLowerCase().trim();
    return pendingReviewsList.filter((r) => {
      const target = (
        r.businessId ? r.businessId?.name : r.placeId?.name || ""
      ).toLowerCase();
      const text = getSafeString(r.review, language).toLowerCase();
      const reviewer = (r.reviewer?.name || "").toLowerCase();
      return target.includes(q) || text.includes(q) || reviewer.includes(q);
    });
  }, [pendingReviewsList, searchQuery, language]);

  // Copy coordinates helper
  const handleCopyCoords = (lat: number, lng: number, id: string) => {
    navigator.clipboard.writeText(`${lat}, ${lng}`);
    setCopiedId(id);
    toast.success(
      isEs ? "Coordenadas copiadas al portapapeles" : "Coordinates copied to clipboard"
    );
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle Approve Spot
  const handleApproveSpot = async (spot: any) => {
    const contributor =
      spot.discoveredByName || spot.discoveredBy?.name || "el usuario";
    appAlert
      .fire({
        title: isEs ? "¿Aprobar lugar recomendado?" : "Approve tourist spot?",
        text: isEs
          ? `¿Deseas aprobar "${getSafeString(
              spot.name,
              language
            )}" y otorgar 25 puntos a ${contributor}? Se publicará en el mapa oficial de inmediato.`
          : `Approve "${getSafeString(
              spot.name,
              language
            )}" and award 25 points to ${contributor}? It will go live immediately.`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: isEs ? "Sí, aprobar (+25 pts)" : "Yes, approve (+25 pts)",
        cancelButtonText: isEs ? "Cancelar" : "Cancel",
        confirmButtonColor: "#10B981",
      })
      .then(async (result) => {
        if (result.isConfirmed) {
          try {
            await reviewRecommendedPlace({
              id: spot._id,
              data: { status: "Published", pointsAwarded: 25 },
            }).unwrap();
            toast.success(
              isEs
                ? "Lugar aprobado y 25 puntos otorgados con éxito."
                : "Spot approved and 25 points awarded!"
            );
            refetchPlaces();
          } catch (err: any) {
            toast.error(err?.data?.message || "Failed to approve spot");
          }
        }
      });
  };

  // Handle Reject Spot Confirmation
  const handleConfirmRejectSpot = async () => {
    if (!rejectSpotTarget) return;
    try {
      await reviewRecommendedPlace({
        id: rejectSpotTarget._id,
        data: {
          status: "Rejected",
          adminFeedback: rejectFeedback.trim(),
        },
      }).unwrap();
      toast.success(
        isEs
          ? "Lugar rechazado exitosamente."
          : "Place rejected successfully."
      );
      setRejectSpotTarget(null);
      setRejectFeedback("");
      refetchPlaces();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to reject place");
    }
  };

  // Handle Approve Review
  const handleApproveReviewItem = async (
    revId: string,
    pointsToAward: number,
    targetName: string
  ) => {
    const pointsInfo = isEs
      ? `Se otorgarán +${pointsToAward} puntos al usuario.`
      : `+${pointsToAward} points will be awarded to reviewer.`;

    appAlert
      .fire({
        title: isEs ? "¿Aprobar esta reseña?" : "Approve this review?",
        text: isEs
          ? `La reseña sobre "${targetName}" se publicará en el sitio. ${pointsInfo}`
          : `The review for "${targetName}" will be published live. ${pointsInfo}`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: isEs
          ? `Sí, aprobar (${pointsToAward > 0 ? `+${pointsToAward}` : "0"} pts)`
          : `Yes, approve (${pointsToAward > 0 ? `+${pointsToAward}` : "0"} pts)`,
        cancelButtonText: isEs ? "Cancelar" : "Cancel",
        confirmButtonColor: "#10B981",
      })
      .then(async (result) => {
        if (result.isConfirmed) {
          try {
            await approveReview(revId).unwrap();
            toast.success(
              isEs ? "Reseña aprobada con éxito." : "Review approved successfully."
            );
            refetchReviews();
          } catch (err: any) {
            toast.error(err?.data?.message || "Failed to approve review");
          }
        }
      });
  };

  // Handle Reject Review
  const handleRejectReviewItem = async (revId: string, targetName: string) => {
    appAlert
      .fire({
        title: isEs ? "¿Rechazar esta reseña?" : "Reject this review?",
        text: isEs
          ? `¿Estás seguro de rechazar la reseña sobre "${targetName}"? No será visible públicamente.`
          : `Are you sure you want to reject the review for "${targetName}"? It will not appear publicly.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: isEs ? "Sí, rechazar" : "Yes, reject",
        cancelButtonText: isEs ? "Cancelar" : "Cancel",
        confirmButtonColor: "#ef4444",
      })
      .then(async (result) => {
        if (result.isConfirmed) {
          try {
            await rejectReview(revId).unwrap();
            toast.success(
              isEs ? "Reseña rechazada." : "Review rejected."
            );
            refetchReviews();
          } catch (err: any) {
            toast.error(err?.data?.message || "Failed to reject review");
          }
        }
      });
  };

  const quickRejectionReasons = [
    {
      label: isEs ? "📍 Ubicación errónea" : "📍 Incorrect location",
      text: isEs
        ? "Las coordenadas o dirección no corresponden a la ubicación real."
        : "The coordinates or address provided do not match the real location.",
    },
    {
      label: isEs ? "📷 Fotos no válidas" : "📷 Blurry/invalid photos",
      text: isEs
        ? "Las fotos adjuntas son de baja resolución o no corresponden al lugar."
        : "The photos attached are unclear or unrelated.",
    },
    {
      label: isEs ? "🔁 Lugar duplicado" : "🔁 Duplicate spot",
      text: isEs
        ? "Este lugar ya se encuentra publicado en el mapa."
        : "This spot is already live on the map.",
    },
    {
      label: isEs ? "⚠️ Info incompleta" : "⚠️ Incomplete details",
      text: isEs
        ? "La información suministrada es insuficiente para los viajeros."
        : "The information provided is incomplete.",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Standard Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2.5">
            <ShieldCheck className="w-8 h-8 text-yellow-500" />
            <span>
              {isEs ? "Verificación y Moderación" : "Verification & Moderation"}
            </span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {isEs
              ? "Revisa y aprueba nuevos lugares turísticos recomendados y reseñas de la comunidad."
              : "Review and approve recommended tourist spots and community reviews."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              refetchPlaces();
              refetchReviews();
            }}
            variant="outline"
            className="flex items-center gap-2 border-gray-300 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 dark:text-slate-200 rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw
              size={14}
              className={isPlacesLoading || isReviewsLoading ? "animate-spin" : ""}
            />
            <span>{isEs ? "Actualizar" : "Refresh"}</span>
          </Button>
        </div>
      </div>

      {/* Two Verification Types Tabs */}
      <div className="flex items-center gap-3 border-b border-gray-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("spots")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === "spots"
              ? "bg-yellow-400 text-black shadow-xs font-black"
              : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
          }`}
        >
          <Sparkles size={16} />
          <span>{isEs ? "Lugares Turísticos" : "Tourist Spots"}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === "spots"
                ? "bg-black/15 text-black"
                : "bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300"
            }`}
          >
            {pendingSpotsList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reviews")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === "reviews"
              ? "bg-blue-600 text-white shadow-xs font-black"
              : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
          }`}
        >
          <MessageSquare size={16} />
          <span>{isEs ? "Reseñas de Usuarios" : "User Reviews"}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === "reviews"
                ? "bg-white/20 text-white"
                : "bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300"
            }`}
          >
            {pendingReviewsList.length}
          </span>
        </button>
      </div>

      {/* Search and Display Toggle Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
          <Input
            placeholder={
              activeTab === "spots"
                ? isEs
                  ? "Buscar lugares pendientes..."
                  : "Search pending spots..."
                : isEs
                ? "Buscar reseñas pendientes..."
                : "Search pending reviews..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 w-full bg-white dark:bg-slate-900/60 border-gray-200 dark:border-slate-800 rounded-xl text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setDisplayMode("grid")}
            className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              displayMode === "grid"
                ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-xs"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
            title={isEs ? "Vista de Tarjetas" : "Card Grid View"}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode("table")}
            className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              displayMode === "table"
                ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-xs"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
            title={isEs ? "Vista de Tabla" : "Table View"}
          >
            <LayoutList size={16} />
          </button>
        </div>
      </div>

      {/* ================= SECTION 1: TOURIST SPOTS VERIFICATION ================= */}
      {activeTab === "spots" && (
        <>
          {isPlacesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-72 bg-gray-200 dark:bg-slate-800 animate-pulse rounded-2xl"
                />
              ))}
            </div>
          ) : filteredSpots.length === 0 ? (
            <Card className="rounded-2xl border-dashed bg-white dark:bg-[#131b2e] border-gray-200 dark:border-slate-800">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 size={40} className="text-emerald-500 mb-2 opacity-80" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                  {isEs
                    ? "No hay lugares turísticos pendientes"
                    : "No pending tourist spots"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-sm">
                  {isEs
                    ? "Todos los lugares recomendados por los viajeros han sido revisados y procesados."
                    : "All recommended spots from travelers have been verified."}
                </p>
              </CardContent>
            </Card>
          ) : displayMode === "grid" ? (
            /* Spots Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSpots.map((spot) => {
                const contributor =
                  spot.discoveredByName ||
                  (typeof spot.discoveredBy === "object"
                    ? spot.discoveredBy?.name
                    : spot.discoveredBy) ||
                  "Usuario";
                const contributorId =
                  typeof spot.discoveredBy === "object"
                    ? spot.discoveredBy?._id || spot.discoveredBy?.id
                    : spot.discoveredBy;
                const userLevel =
                  typeof spot.discoveredBy === "object"
                    ? spot.discoveredBy?.level
                    : null;
                const lat = spot.location?.coordinates?.[1];
                const lng = spot.location?.coordinates?.[0];
                const thumbnail = spot.media?.[0];

                return (
                  <Card
                    key={spot._id}
                    className="rounded-2xl shadow-sm bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col justify-between hover:border-yellow-400/50 dark:hover:border-yellow-500/40 hover:shadow-md transition-all p-0"
                  >
                    {/* Top Image Banner - Clickable to open full details & map */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setModalPlaceId(spot._id);
                        setIsPlaceModalOpen(true);
                      }}
                      className="relative h-48 w-full bg-slate-900 overflow-hidden cursor-pointer group select-none"
                      title={
                        isEs
                          ? "Haz clic para ver mapa interactivo y detalles completos"
                          : "Click to view interactive map and full details"
                      }
                    >
                      {thumbnail ? (
                        <img
                          src={getImageUrl(thumbnail)}
                          alt={getSafeString(spot.name, language)}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-yellow-400 bg-slate-800">
                          <Compass size={36} className="opacity-70 mb-1" />
                          <span className="text-[11px] text-gray-400">
                            {isEs ? "Sin foto" : "No photo"}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/20 group-hover:from-black/90 transition-all" />

                      {/* Map & Category Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                        {spot.map?.name ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/70 text-white backdrop-blur-md border border-white/10 shadow-xs">
                            🗺️ {getSafeString(spot.map.name, language)}
                          </span>
                        ) : <div />}

                        {spot.category?.name && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-yellow-400 text-black shadow-xs">
                            {getSafeString(spot.category.name, language)}
                          </span>
                        )}
                      </div>

                      {/* Hover Overlay Hint */}
                      <div className="absolute top-12 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <span className="px-3 py-1 rounded-full bg-yellow-400 text-black text-xs font-black shadow-lg flex items-center gap-1.5">
                          <Eye size={13} />
                          {isEs ? "Inspeccionar Lugar y Mapa" : "Inspect Spot & Map"}
                        </span>
                      </div>

                      {/* Spot Title inside banner */}
                      <div className="absolute bottom-3 left-3 right-3 text-white pointer-events-none">
                        <h3 className="text-base font-black truncate drop-shadow-md group-hover:text-yellow-300 transition-colors flex items-center justify-between">
                          <span>{getSafeString(spot.name, language)}</span>
                          <span className="text-[10px] bg-black/60 px-2 py-0.5 rounded-full border border-white/20 text-white/90">
                            {isEs ? "Ver detalles ↗" : "View details ↗"}
                          </span>
                        </h3>
                        <p className="text-xs text-white/80 truncate flex items-center gap-1.5 mt-0.5">
                          <MapPin size={12} className="text-yellow-400 shrink-0" />
                          <span>{spot.address || (isEs ? "Sin dirección" : "No address")}</span>
                        </p>
                      </div>
                    </div>

                    {/* Card Body */}
                    <CardContent className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        {/* Contributor Pill */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fabf13]/10 text-yellow-800 dark:text-yellow-300 border border-yellow-500/20 font-semibold">
                            <Sparkles size={11} className="text-yellow-500" />
                            <span>
                              {isEs ? "Descubierto por:" : "Discovered by:"}{" "}
                              {contributorId ? (
                                <Link
                                  href={`/explorer/${contributorId}`}
                                  target="_blank"
                                  className="underline font-bold hover:text-yellow-600 transition-colors"
                                >
                                  {contributor}
                                </Link>
                              ) : (
                                <strong>{contributor}</strong>
                              )}
                            </span>
                            {userLevel !== null && (
                              <span className="px-1.5 py-0.2 rounded bg-yellow-400 text-black font-extrabold text-[10px]">
                                Lv {userLevel}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            +25 pts
                          </span>
                        </div>

                        {/* Geographic Coordinates & Direct Map Inspection Box */}
                        {lat !== undefined && lng !== undefined && (
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-gray-200 dark:border-slate-800 space-y-2.5">
                            <div className="flex items-center justify-between text-[11px] font-mono text-gray-700 dark:text-slate-300">
                              <span className="flex items-center gap-1 font-semibold">
                                <MapPin size={12} className="text-yellow-500" />
                                Lat: {Number(lat).toFixed(4)}, Lng: {Number(lng).toFixed(4)}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyCoords(lat, lng, spot._id);
                                }}
                                className="text-gray-500 hover:text-yellow-500 cursor-pointer p-0.5"
                                title={isEs ? "Copiar coordenadas" : "Copy coordinates"}
                              >
                                {copiedId === spot._id ? (
                                  <CheckCheck size={13} className="text-emerald-500" />
                                ) : (
                                  <Copy size={13} />
                                )}
                              </button>
                            </div>

                            {/* Direct Map Action Buttons */}
                            <div className="grid grid-cols-2 gap-2 pt-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setModalPlaceId(spot._id);
                                  setIsPlaceModalOpen(true);
                                }}
                                className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[#fabf13]/15 hover:bg-[#fabf13]/25 text-yellow-800 dark:text-yellow-300 text-[11px] font-bold border border-yellow-500/30 transition-all cursor-pointer"
                                title={isEs ? "Abrir mapa y vista satelital" : "Open map and satellite view"}
                              >
                                <Compass size={13} className="text-yellow-500" />
                                <span>{isEs ? "Ver Mapa y Datos" : "View Map & Info"}</span>
                              </button>
                              <a
                                href={`https://www.google.com/maps?q=${lat},${lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-200 dark:border-blue-800 transition-all cursor-pointer"
                              >
                                <ExternalLink size={13} />
                                <span>{isEs ? "Google Maps ↗" : "Google Maps ↗"}</span>
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Description snippet - Clickable to open full modal */}
                        {spot.description && (
                          <div
                            onClick={() => {
                              setModalPlaceId(spot._id);
                              setIsPlaceModalOpen(true);
                            }}
                            className="p-2.5 rounded-xl bg-[#fabf13]/5 hover:bg-[#fabf13]/10 border border-yellow-500/15 cursor-pointer transition-colors group/desc"
                            title={isEs ? "Haz clic para ver descripción completa" : "Click to view full description"}
                          >
                            <div className="text-[10px] uppercase font-bold text-yellow-700 dark:text-yellow-400 mb-0.5 flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <MessageSquare size={11} />
                                {isEs ? "Nota del Viajero" : "Traveler Note"}
                              </span>
                              <span className="text-[10px] text-gray-400 group-hover/desc:text-yellow-500">
                                ↗
                              </span>
                            </div>
                            <p className="text-xs text-gray-700 dark:text-slate-300 line-clamp-2 italic font-normal">
                              "{spot.description}"
                            </p>
                          </div>
                        )}

                        {/* Additional Photos Count - Clickable */}
                        {spot.media && spot.media.length > 1 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                              {isEs ? `Fotos adjuntas (${spot.media.length})` : `Attached Photos (${spot.media.length})`}
                            </span>
                            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                              {spot.media.slice(1, 5).map((img: string, idx: number) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setModalPlaceId(spot._id);
                                    setIsPlaceModalOpen(true);
                                  }}
                                  className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-800 shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
                                  title={isEs ? "Ver fotos en detalle" : "View photos in detail"}
                                >
                                  <img
                                    src={getImageUrl(img)}
                                    alt="Gallery thumb"
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ))}
                              {spot.media.length > 5 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalPlaceId(spot._id);
                                    setIsPlaceModalOpen(true);
                                  }}
                                  className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors shrink-0 cursor-pointer"
                                  title={isEs ? "Ver más fotos" : "View more photos"}
                                >
                                  +{spot.media.length - 5}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2 mt-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setModalPlaceId(spot._id);
                            setIsPlaceModalOpen(true);
                          }}
                          className="h-9 px-3 rounded-xl border-yellow-300 dark:border-yellow-700/60 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-950/40 text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Eye size={15} className="text-yellow-500" />
                          <span>{isEs ? "Ver Mapa y Datos" : "View Map & Info"}</span>
                        </Button>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRejectSpotTarget(spot);
                              setRejectFeedback("");
                            }}
                            disabled={isReviewingPlace}
                            className="h-9 px-3 rounded-xl border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold cursor-pointer"
                          >
                            <X size={14} className="mr-1" />
                            {isEs ? "Rechazar" : "Reject"}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApproveSpot(spot)}
                            disabled={isReviewingPlace}
                            className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs cursor-pointer"
                          >
                            <Check size={15} className="mr-1" />
                            {isEs ? "Aprobar (+25)" : "Approve (+25)"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* Spots Table View matching PlacesTable */
            <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-800">
                      <th className="px-5 py-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        {isEs ? "Lugar Turístico" : "Tourist Spot"}
                      </th>
                      <th className="px-5 py-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        {isEs ? "Categoría" : "Category"}
                      </th>
                      <th className="px-5 py-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        {isEs ? "Mapa" : "Map"}
                      </th>
                      <th className="px-5 py-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        {isEs ? "Descubierto por" : "Discovered by"}
                      </th>
                      <th className="px-5 py-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        {isEs ? "Coordenadas" : "Coordinates"}
                      </th>
                      <th className="px-5 py-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right">
                        {isEs ? "Acciones" : "Actions"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-800/60">
                    {filteredSpots.map((spot) => {
                      const contributor =
                        spot.discoveredByName ||
                        (typeof spot.discoveredBy === "object"
                          ? spot.discoveredBy?.name
                          : spot.discoveredBy) ||
                        "Usuario";
                      const contributorId =
                        typeof spot.discoveredBy === "object"
                          ? spot.discoveredBy?._id || spot.discoveredBy?.id
                          : spot.discoveredBy;
                      const lat = spot.location?.coordinates?.[1];
                      const lng = spot.location?.coordinates?.[0];
                      const thumbnail = spot.media?.[0];

                      return (
                        <tr
                          key={spot._id}
                          className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="px-5 py-4">
                            <div
                              onClick={() => {
                                setModalPlaceId(spot._id);
                                setIsPlaceModalOpen(true);
                              }}
                              className="flex items-center gap-3 cursor-pointer group"
                              title={isEs ? "Haz clic para ver detalles y mapa" : "Click to view details and map"}
                            >
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-gray-200 dark:border-slate-800 group-hover:border-yellow-400 transition-colors">
                                {thumbnail ? (
                                  <img
                                    src={getImageUrl(thumbnail)}
                                    alt={getSafeString(spot.name, language)}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-yellow-500 bg-slate-800">
                                    <Compass size={18} />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100 group-hover:text-yellow-500 transition-colors truncate max-w-xs flex items-center gap-1">
                                  <span>{getSafeString(spot.name, language)}</span>
                                  <span className="text-[10px] text-gray-400 group-hover:text-yellow-500">↗</span>
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-xs">
                                  {spot.address || "N/A"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs font-semibold text-gray-700 dark:text-slate-300">
                            {getSafeString(spot.category?.name, language) || "N/A"}
                          </td>
                          <td className="px-5 py-4 text-xs font-semibold text-gray-700 dark:text-slate-300">
                            {getSafeString(spot.map?.name, language) || "N/A"}
                          </td>
                          <td className="px-5 py-4 text-xs font-medium text-gray-700 dark:text-slate-300">
                            {contributorId ? (
                              <Link
                                href={`/explorer/${contributorId}`}
                                target="_blank"
                                className="font-bold underline hover:text-yellow-600 transition-colors"
                              >
                                {contributor}
                              </Link>
                            ) : (
                              <span className="font-bold">{contributor}</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-xs font-mono text-gray-600 dark:text-slate-400">
                            {lat !== undefined && lng !== undefined ? (
                              <div className="flex items-center gap-2">
                                <span>
                                  {Number(lat).toFixed(3)}, {Number(lng).toFixed(3)}
                                </span>
                                <a
                                  href={`https://www.google.com/maps?q=${lat},${lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 p-1"
                                  title="Google Maps"
                                >
                                  <ExternalLink size={13} />
                                </a>
                              </div>
                            ) : (
                              "N/A"
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setModalPlaceId(spot._id);
                                  setIsPlaceModalOpen(true);
                                }}
                                className="h-8 px-2.5 text-xs font-bold gap-1 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800 hover:bg-yellow-50 dark:hover:bg-yellow-950/30 cursor-pointer"
                                title={isEs ? "Ver Mapa y Detalles" : "View Map & Details"}
                              >
                                <Eye size={14} />
                                <span>{isEs ? "Detalles" : "Details"}</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setRejectSpotTarget(spot);
                                  setRejectFeedback("");
                                }}
                                className="h-8 px-2.5 text-xs text-rose-600 border-rose-200 dark:border-rose-900 cursor-pointer font-bold"
                              >
                                <X size={14} />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleApproveSpot(spot)}
                                className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                              >
                                <Check size={14} className="mr-1" />
                                +25 pts
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ================= SECTION 2: USER REVIEWS VERIFICATION ================= */}
      {activeTab === "reviews" && (
        <>
          {isReviewsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-64 bg-gray-200 dark:bg-slate-800 animate-pulse rounded-2xl"
                />
              ))}
            </div>
          ) : filteredReviews.length === 0 ? (
            <Card className="rounded-2xl border-dashed bg-white dark:bg-[#131b2e] border-gray-200 dark:border-slate-800">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 size={40} className="text-emerald-500 mb-2 opacity-80" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                  {isEs ? "No hay reseñas pendientes" : "No pending reviews"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-sm">
                  {isEs
                    ? "Todas las reseñas de la comunidad han sido moderadas."
                    : "All community reviews have been verified."}
                </p>
              </CardContent>
            </Card>
          ) : (
            /* Reviews Cards matching original Dashboard Card design */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredReviews.map((review: any) => {
                const isBusiness = !!review.businessId;
                const targetEntity = isBusiness ? review.businessId : review.placeId;
                const targetType = isBusiness
                  ? isEs
                    ? "Negocio"
                    : "Business"
                  : isEs
                  ? "Lugar Turístico"
                  : "Tourist Spot";
                const targetName =
                  getSafeString(targetEntity?.name, language) ||
                  (isBusiness ? "Unknown Business" : "Unknown Place");

                const targetMedia = targetEntity?.media;
                const targetThumb = Array.isArray(targetMedia)
                  ? targetMedia[0]
                  : typeof targetMedia === "object"
                  ? targetMedia?.photos?.[0]
                  : null;

                const targetAddress =
                  targetEntity?.address ||
                  targetEntity?.location?.address ||
                  targetEntity?.location?.city ||
                  "";
                const targetMapName = targetEntity?.map
                  ? getSafeString(targetEntity.map.name, language)
                  : null;

                const reviewerName =
                  getSafeString(review.reviewer?.name, language) ||
                  (isEs ? "Usuario" : "User");
                const reviewerProfile = review.reviewer?.profile;
                const reviewerLevel = review.reviewer?.level ?? 0;
                const reviewContent = getSafeString(review.review, language);

                // Calculate point breakdown (New values: Rating 1pt, Text 4pts, 200+ chars 5pts)
                let calculatedPoints = 1;
                if (reviewContent && reviewContent.trim() !== "") {
                  calculatedPoints += 4;
                  if (reviewContent.trim().length >= 200) {
                    calculatedPoints += 5;
                  }
                }

                // Review awards calculated points: Rating 1pt, Text 4pts, 200+ chars 5pts bonus (total up to 10 pts)
                const pointsToAward = calculatedPoints;

                return (
                  <Card
                    key={review._id}
                    className="rounded-3xl shadow-xs hover:shadow-md transition-all bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col justify-between"
                  >
                    {/* Top Identity Header */}
                    <div className="p-4 sm:p-5 pb-3 border-b border-gray-100 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-900/40">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Thumbnail */}
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gray-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-gray-200 dark:border-slate-700/80 flex items-center justify-center">
                            {targetThumb ? (
                              <img
                                src={getImageUrl(targetThumb)}
                                alt={targetName}
                                className="w-full h-full object-cover"
                              />
                            ) : isBusiness ? (
                              <Building2 size={22} className="text-purple-500 opacity-80" />
                            ) : (
                              <MapPin size={22} className="text-yellow-500 opacity-80" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span
                                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                  isBusiness
                                    ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40"
                                }`}
                              >
                                {targetType}
                              </span>
                              {targetMapName && (
                                <span className="text-[10px] font-bold text-yellow-800 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800/40 px-2 py-0.5 rounded-md truncate max-w-44">
                                  🗺️ {targetMapName}
                                </span>
                              )}
                            </div>

                            <h4
                              className="text-base font-extrabold text-gray-900 dark:text-slate-100 leading-snug truncate"
                              title={targetName}
                            >
                              {targetName}
                            </h4>

                            {targetAddress && (
                              <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                                <MapPin size={12} className="shrink-0 text-gray-400" />
                                <span className="truncate">{targetAddress}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Rating & Points Pill */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-900/40 px-3 py-1 rounded-full text-xs font-black shadow-2xs">
                            <Star className="w-3.5 h-3.5 fill-yellow-400 stroke-yellow-400" />
                            <span>{review.rating || 0}.0</span>
                          </div>

                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Sparkles size={11} className="text-emerald-500" />
                            +{pointsToAward} pts
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Reviewer Row */}
                    <div className="px-5 pt-3.5 pb-2 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="w-7 h-7 border border-gray-200 dark:border-slate-700 shrink-0">
                          <AvatarImage src={getProfileImageUrl(reviewerProfile)} alt={reviewerName} />
                          <AvatarFallback />
                        </Avatar>
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="font-bold text-gray-800 dark:text-slate-200 truncate">
                            {reviewerName}
                          </span>
                          {typeof reviewerLevel === "number" && (
                            <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400">
                              Nvl {reviewerLevel}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="text-[11px] text-gray-400 dark:text-slate-500 shrink-0 flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(review.createdAt || Date.now()).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    {/* Review Content & Photos */}
                    <CardContent className="space-y-3 px-5 py-2 flex-1 flex flex-col justify-between">
                      <div className="relative p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-900/60 border border-gray-100 dark:border-slate-800/60">
                        <p className="text-sm text-gray-800 dark:text-slate-200 leading-relaxed italic">
                          "{reviewContent || (isEs ? "Sin comentario escrito (solo calificación de estrellas)" : "No review text provided (star rating only)")}"
                        </p>

                        <div className="mt-2.5 pt-2 border-t border-gray-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-gray-400 dark:text-slate-500 font-medium">
                          <span>
                            {reviewContent.trim().length} {isEs ? "caracteres" : "chars"}
                          </span>
                          {reviewContent.trim().length >= 200 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <Sparkles size={11} />
                              {isEs ? "Bono completo (1+4+5 = 10 pts)" : "Full bonus (1+4+5 = 10 pts)"}
                            </span>
                          ) : reviewContent.trim().length > 0 ? (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              {isEs ? "Calificación + Texto (1+4 = 5 pts)" : "Rating + Text (1+4 = 5 pts)"}
                            </span>
                          ) : (
                            <span className="text-gray-600 dark:text-slate-400 font-medium">
                              {isEs ? "Solo calificación (1 pt)" : "Rating only (1 pt)"}
                            </span>
                          )}
                        </div>
                      </div>

                      {review.media && review.media.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            {isEs ? "Fotos adjuntas:" : "Attached photos:"}
                          </span>
                          <div className="flex gap-2 overflow-x-auto py-1">
                            {review.media.map((img: string, idx: number) => (
                              <a
                                key={idx}
                                href={getImageUrl(img)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative"
                              >
                                <img
                                  src={getImageUrl(img)}
                                  alt="Review upload"
                                  className="w-16 h-16 object-cover rounded-xl border border-gray-200 dark:border-slate-800 shrink-0 group-hover:opacity-90 transition-opacity"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-150 dark:border-slate-800 mt-auto">
                        {review.placeId?._id || review.placeId ? (
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => {
                              setModalPlaceId(review.placeId?._id || review.placeId);
                              setIsPlaceModalOpen(true);
                            }}
                            className="h-9 px-3 rounded-xl border-yellow-300 dark:border-yellow-700/60 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-950/40 text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Eye size={14} className="text-yellow-500" />
                            <span>{isEs ? "Ver Lugar" : "View Spot"}</span>
                          </Button>
                        ) : (
                          <div />
                        )}

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => handleRejectReviewItem(review._id, targetName)}
                            disabled={isApprovingReview || isRejectingReview}
                            className="h-9 px-3.5 rounded-xl border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5 mr-1" />
                            {isEs ? "Rechazar" : "Reject"}
                          </Button>
                          <Button
                            size="sm"
                            type="button"
                            onClick={() => handleApproveReviewItem(review._id, pointsToAward, targetName)}
                            disabled={isApprovingReview || isRejectingReview}
                            className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>
                              {isEs ? "Aprobar" : "Approve"}{" "}
                              <span className="font-black opacity-90">
                                ({pointsToAward > 0 ? `+${pointsToAward}` : "0"} pts)
                              </span>
                            </span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* QUICK-REASON REJECTION DIALOG */}
      <Dialog
        open={!!rejectSpotTarget}
        onOpenChange={(open) => !open && setRejectSpotTarget(null)}
      >
        <DialogContent className="max-w-lg bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 p-6 rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <AlertTriangle className="text-rose-500 w-5 h-5" />
              {isEs ? "Rechazar Lugar Recomendado" : "Reject Tourist Spot"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">
              {isEs
                ? `Selecciona un motivo rápido o escribe feedback para el usuario sobre "${getSafeString(
                    rejectSpotTarget?.name,
                    language
                  )}":`
                : `Select a quick reason or enter custom feedback for "${getSafeString(
                    rejectSpotTarget?.name,
                    language
                  )}":`}
            </p>

            {/* Quick Reason Chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {isEs ? "Motivos rápidos frecuentes:" : "Frequent quick reasons:"}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickRejectionReasons.map((qr, qIdx) => (
                  <button
                    key={qIdx}
                    type="button"
                    onClick={() => setRejectFeedback(qr.text)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-yellow-100 dark:hover:bg-yellow-950/40 text-gray-700 dark:text-slate-300 font-medium transition-colors text-left cursor-pointer border border-gray-200 dark:border-slate-700"
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={rejectFeedback}
              onChange={(e) => setRejectFeedback(e.target.value)}
              rows={4}
              placeholder={
                isEs
                  ? "Escribe el motivo detallado de rechazo..."
                  : "Write detailed rejection feedback for the user..."
              }
              className="w-full rounded-2xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-3 text-xs sm:text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 resize-none"
            />
          </div>

          <DialogFooter className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setRejectSpotTarget(null)}
              className="rounded-xl font-semibold dark:border-slate-700"
            >
              {isEs ? "Cancelar" : "Cancel"}
            </Button>
            <Button
              onClick={handleConfirmRejectSpot}
              disabled={isReviewingPlace}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer"
            >
              {isReviewingPlace ? (
                <>
                  <RefreshCw size={14} className="animate-spin mr-1.5" />
                  {isEs ? "Rechazando..." : "Rejecting..."}
                </>
              ) : isEs ? (
                "Confirmar Rechazo"
              ) : (
                "Confirm Rejection"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Place Full Modal */}
      <ViewPlaceModal
        open={isPlaceModalOpen}
        onOpenChange={setIsPlaceModalOpen}
        placeId={modalPlaceId}
      />
    </div>
  );
}
