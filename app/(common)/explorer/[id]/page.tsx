"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DEFAULT_AVATAR, formatDate, getImageUrl, getLocalized, getProfileImageUrl } from "@/lib/utils";
import ProfileUpdateModal from "@/components/Common/profile/profile-update-modal";
import { useGetProfileQuery } from "@/redux/features/user/userApi";
import { useAppSelector } from "@/redux/hook";
import { NoImage } from "@/lib/others/others";
import { shareProfile } from "@/lib/share-profile";
import { useGetPublicProfileQuery } from "@/redux/features/user/userApi";
import { useGetLevelConfigsQuery } from "@/redux/features/award/awardApi";
import { getEffectiveLevels, calculateUserLevel } from "@/lib/level-utils";
import { useMemo } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { CategoryIcon } from "@/components/shared/categories/category-icon";
import {
  ArrowLeft,
  Globe,
  Instagram,
  Share2,
  Star,
  MapPin,
  Sparkles,
  Trophy,
  Calendar,
  Compass,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Check,
  Copy,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";

const USER_LEVELS = [
  "Explorador",
  "Aventurero",
  "Tlacuilo",
  "Expedicionario",
  "Viajero",
  "Chasqui",
  "Cronista",
  "Baquiano",
  "Cartógrafo",
  "Maestro Ruta",
  "Leyenda",
  "Gran Leyenda",
  "Mítico",
  "Inmortal",
  "Supremo",
];

const USER_LEVEL_KEYS = [
  "explorador",
  "aventurero",
  "tlacuilo",
  "expedicionario",
  "viajero",
  "chasqui",
  "cronista",
  "baquiano",
  "cartografo",
  "maestro_ruta",
  "leyenda",
  "gran_leyenda",
  "mitico",
  "inmortal",
  "supremo",
];

export default function ExplorerProfilePage() {
  const { t, language } = useLanguage();
  const isEs = language === "es";
  const params = useParams();
  const userId = String(params?.id || "");

  const isAuthenticated = useAppSelector((state) => state.auth.accessToken);
  const { data: myProfile } = useGetProfileQuery(undefined, {
    skip: !isAuthenticated,
  });

  const isOwner = Boolean(
    myProfile?._id && String(myProfile._id) === String(userId)
  );

  const { data: publicData, isLoading, isError, error } = useGetPublicProfileQuery(userId, {
    skip: !userId,
  });

  // Owner fallback: if public profile query fails (e.g. private or verified flag), owner can still view their profile
  const data = publicData || (isOwner ? myProfile : null);

  const [isSharing, setIsSharing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"places" | "reviews">("places");
  const [copied, setCopied] = useState(false);

  const { data: levelsRes } = useGetLevelConfigsQuery();
  const effectiveLevels = useMemo(
    () => getEffectiveLevels(levelsRes, language),
    [levelsRes, language]
  );
  const levelCalc = useMemo(
    () => calculateUserLevel(data?.points || 0, data?.totalReviewsApproved || 0, effectiveLevels),
    [data?.points, data?.totalReviewsApproved, effectiveLevels]
  );

  const handleShare = async () => {
    setIsSharing(true);
    try {
      await shareProfile({
        userId: data?._id || userId,
        name: data?.name,
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    } finally {
      setIsSharing(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-[75vh] bg-gray-50/70 dark:bg-[#0b0f19] flex items-center justify-center px-4 font-inter">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-amber-400 border-t-transparent" />
          <p className="text-sm font-semibold text-gray-500 dark:text-slate-400 animate-pulse">
            {t("explorer.loading_profile") || (isEs ? "Cargando perfil del explorador..." : "Loading explorer profile...")}
          </p>
        </div>
      </main>
    );
  }

  if (!isLoading && !data) {
    const message =
      (error as any)?.data?.message ||
      (isEs ? "Este perfil de explorador no está disponible o es privado." : "This explorer profile is not available or private.");
    return (
      <main className="min-h-[75vh] bg-gray-50/70 dark:bg-[#0b0f19] flex items-center justify-center px-4 font-inter">
        <div className="max-w-md w-full bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <Compass size={32} />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-black text-gray-900 dark:text-slate-100">
              {t("explorer.profile_unavailable") || (isEs ? "Perfil No Disponible" : "Profile Unavailable")}
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">{message}</p>
          </div>
          <div className="pt-2">
            <Link href="/maps">
              <Button className="w-full bg-amber-400 hover:bg-amber-500 text-black font-bold h-11 rounded-xl shadow-md cursor-pointer">
                {isEs ? "Explorar Mapas" : "Explore Maps"}
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const levelNumber = data?.levelInfo?.levelNumber ?? levelCalc.currentLevelNumber;
  const levelName =
    data?.levelInfo?.title ||
    (typeof data?.levelInfo?.name === "string"
      ? data.levelInfo.name
      : getLocalized(data?.levelInfo?.name, language)) ||
    levelCalc.currentLevelName;

  const discoveredPlaces: any[] = Array.isArray(data.discoveredPlaces)
    ? data.discoveredPlaces
    : [];
  const reviews: any[] = Array.isArray(data.reviews) ? data.reviews : [];

  return (
    <main className="min-h-screen bg-gray-50/70 dark:bg-[#0b0f19] text-gray-900 dark:text-slate-100 font-inter pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Navigation Breadcrumb & Share Button */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <Link
            href="/maps"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>{isEs ? "Volver a los mapas" : "Back to maps"}</span>
          </Link>

          <div className="flex items-center gap-2">
            {isOwner && (
              <Button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="h-9 px-3.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-black text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <Edit2 size={14} />
                <span>{isEs ? "Editar Perfil" : "Edit Profile"}</span>
              </Button>
            )}

            <Button
              type="button"
              onClick={handleShare}
              disabled={isSharing}
              variant="outline"
              className="h-9 px-3.5 rounded-xl border-gray-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] hover:bg-amber-500/10 text-xs font-bold text-gray-800 dark:text-slate-200 hover:text-amber-500 dark:hover:text-amber-400 inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-500" />
                  <span className="text-emerald-500">{isEs ? "¡Enlace copiado!" : "Link copied!"}</span>
                </>
              ) : (
                <>
                  <Share2 size={14} />
                  <span>{isEs ? "Compartir" : "Share"}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* HERO PROFILE CARD */}
        <div className="bg-white dark:bg-[#131b2e] border border-gray-200/90 dark:border-slate-800/90 rounded-3xl overflow-hidden shadow-xl shadow-black/5 dark:shadow-black/20">
          {/* Cover Gradient Banner */}
          <div className="h-36 sm:h-52 w-full bg-gradient-to-r from-amber-600/30 via-slate-900/80 to-amber-950/40 relative overflow-hidden border-b border-gray-200 dark:border-slate-800/80">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.25),transparent_60%)]" />
            <div className="absolute top-4 right-4 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-amber-300 text-xs font-bold shadow-sm">
              <Sparkles size={13} className="text-amber-400" />
              <span>{isEs ? "Explorador de Roadtripeado" : "Roadtripeado Explorer"}</span>
            </div>
          </div>

          {/* Profile Header Details */}
          <div className="px-5 sm:px-8 pb-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-6">
              {/* Avatar + Level Badge */}
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
                <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-3xl border-4 border-white dark:border-[#131b2e] shadow-2xl overflow-hidden bg-gray-100 dark:bg-slate-800 shrink-0">
                  <Image
                    src={getProfileImageUrl(data.profile)}
                    alt={data.name || "Explorer"}
                    width={200}
                    height={200}
                    unoptimized
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
                    }}
                    className="object-cover w-full h-full"
                  />
                  {/* Floating Level Pill */}
                  <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 bg-amber-400 text-black font-black text-[11px] rounded-lg shadow-md border border-black/10">
                    Lv {levelNumber}
                  </div>
                </div>

                {/* Name, Level, Badges */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tight">
                      {data.name || "Explorer"}
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold border border-blue-500/20">
                      <ShieldCheck size={12} />
                      <span>{isEs ? "Verificado" : "Verified"}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                    {/* Rank Badge */}
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400 text-black text-xs font-black uppercase tracking-wider shadow-sm shadow-amber-500/20">
                      <Star size={12} className="fill-black stroke-black" />
                      <span>{levelName}</span>
                    </div>

                    {/* Joined date */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800/80 text-gray-600 dark:text-slate-300 text-xs font-semibold border border-gray-200 dark:border-slate-700/60">
                      <Calendar size={12} className="text-gray-400" />
                      <span>
                        {isEs ? "Miembro desde" : "Member since"}{" "}
                        {formatDate(data.createdAt) || "—"}
                      </span>
                    </div>

                    {/* Location / City */}
                    {(data.address?.city || data.city) && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800/80 text-gray-600 dark:text-slate-300 text-xs font-semibold border border-gray-200 dark:border-slate-700/60">
                        <MapPin size={12} className="text-amber-500" />
                        <span>{data.address?.city || data.city}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Social and Website Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 sm:pt-0">
                {data.instagram && (
                  <a
                    href={
                      data.instagram.startsWith("http")
                        ? data.instagram
                        : `https://instagram.com/${String(data.instagram).replace(/^@/, "")}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-orange-500/10 hover:from-pink-500/20 hover:to-orange-500/20 border border-pink-500/30 text-pink-600 dark:text-pink-400 text-xs font-bold transition-all shadow-xs"
                  >
                    <Instagram size={14} />
                    <span>Instagram</span>
                  </a>
                )}

                {data.website && (
                  <a
                    href={
                      data.website.startsWith("http")
                        ? data.website
                        : `https://${data.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 text-xs font-bold transition-all shadow-xs"
                  >
                    <Globe size={14} className="text-blue-500" />
                    <span>Website</span>
                  </a>
                )}
              </div>
            </div>

            {/* Bio / Description */}
            {data.description && (
              <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-slate-900/60 border border-gray-200/80 dark:border-slate-800 mb-6 text-left">
                <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-300 leading-relaxed font-medium">
                  {data.description}
                </p>
              </div>
            )}

            {/* KEY STATS COUNTERS GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Points */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 text-left">
                <div className="flex items-center justify-between text-amber-500 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    {isEs ? "Puntos" : "Points"}
                  </span>
                  <Trophy size={16} />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tight">
                  {(data.points || 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                  {isEs ? "Recompensas acumuladas" : "Earned rewards"}
                </p>
              </div>

              {/* Discovered Spots */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 text-left">
                <div className="flex items-center justify-between text-blue-500 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                    {isEs ? "Descubiertos" : "Discovered"}
                  </span>
                  <Compass size={16} />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tight">
                  {discoveredPlaces.length}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                  {isEs ? "Lugares recomendados" : "Recommended spots"}
                </p>
              </div>

              {/* Visited Places */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 text-left">
                <div className="flex items-center justify-between text-emerald-500 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    {isEs ? "Visitados" : "Visited"}
                  </span>
                  <MapPin size={16} />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tight">
                  {data.visitedPlacesCount || 0}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                  {isEs ? "Destinos completados" : "Destinations visited"}
                </p>
              </div>

              {/* Reviews & Experiences */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 text-left">
                <div className="flex items-center justify-between text-purple-500 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                    {isEs ? "Reseñas" : "Reviews"}
                  </span>
                  <Star size={16} />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tight">
                  {reviews.length}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                  {isEs ? "Experiencias publicadas" : "Published reviews"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT TABS */}
        <div className="mt-8 space-y-6">
          {/* Tab Selector */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 w-fit shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab("places")}
              className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
                activeTab === "places"
                  ? "bg-amber-400 text-black shadow-md shadow-amber-500/20 font-black"
                  : "text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Compass size={16} />
              <span>{isEs ? "Lugares Descubiertos" : "Discovered Spots"}</span>
              <span
                className={`px-2 py-0.2 rounded-full text-[11px] font-bold ${
                  activeTab === "places"
                    ? "bg-black/15 text-black"
                    : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400"
                }`}
              >
                {discoveredPlaces.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("reviews")}
              className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
                activeTab === "reviews"
                  ? "bg-amber-400 text-black shadow-md shadow-amber-500/20 font-black"
                  : "text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Star size={16} />
              <span>{isEs ? "Reseñas y Experiencias" : "Reviews & Experiences"}</span>
              <span
                className={`px-2 py-0.2 rounded-full text-[11px] font-bold ${
                  activeTab === "reviews"
                    ? "bg-black/15 text-black"
                    : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400"
                }`}
              >
                {reviews.length}
              </span>
            </button>
          </div>

          {/* TAB 1: DISCOVERED SPOTS */}
          {activeTab === "places" && (
            <div>
              {discoveredPlaces.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {discoveredPlaces.map((place: any) => {
                    const placeName =
                      getLocalized(place.name, language) ||
                      (typeof place.name === "string" ? place.name : "Spot");
                    const coverMedia = Array.isArray(place.media)
                      ? place.media[0]
                      : place.media;
                    const catName =
                      getLocalized(place.category?.name, language) ||
                      place.category?.name ||
                      "";
                    const mapName =
                      getLocalized(place.map?.name, language) ||
                      place.map?.name ||
                      place.map?.country ||
                      "";

                    return (
                      <Link
                        key={place._id}
                        href={`/places/${place._id}`}
                        className="group bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-400/80 rounded-3xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col text-left cursor-pointer"
                      >
                        {/* Cover Image */}
                        <div className="relative aspect-video w-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                          {coverMedia ? (
                            <img
                              src={getImageUrl(coverMedia)}
                              alt={placeName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-600">
                              <Compass size={36} />
                            </div>
                          )}

                          {/* Category Badge */}
                          {catName && (
                            <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white text-[11px] font-bold border border-white/10 shadow-sm">
                              {place.category?.icon && (
                                <CategoryIcon
                                  icon={place.category.icon}
                                  size={13}
                                  color={place.category.color || "#FFC107"}
                                />
                              )}
                              <span>{catName}</span>
                            </div>
                          )}

                          {/* Rating Pill */}
                          <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-amber-300 text-xs font-black border border-white/10 shadow-sm">
                            <Star size={12} className="fill-amber-400 text-amber-400" />
                            <span>{(Number(place.rating) || 5).toFixed(1)}</span>
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                          <div className="space-y-1.5">
                            <h3 className="font-bold text-base text-gray-900 dark:text-slate-100 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                              {placeName}
                            </h3>

                            {place.address && (
                              <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5 line-clamp-1">
                                <MapPin size={13} className="text-amber-500 shrink-0" />
                                <span>{place.address}</span>
                              </p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-gray-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-gray-400 dark:text-slate-500">
                            <span>{mapName || (isEs ? "Puerto Rico" : "Puerto Rico")}</span>
                            <span className="font-bold text-amber-600 dark:text-amber-400 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                              <span>{isEs ? "Ver lugar" : "View spot"}</span>
                              <ExternalLink size={12} />
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="p-10 sm:p-14 rounded-3xl bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 text-center space-y-3 shadow-xs">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                    <Compass size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                    {isEs ? "Aún no ha descubierto lugares" : "No discovered spots yet"}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
                    {isEs
                      ? "Cuando este explorador recomiende nuevos lugares turísticos y sean aprobados, aparecerán destacados aquí."
                      : "When this explorer recommends new tourist spots and they are approved, they will be showcased here."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REVIEWS & EXPERIENCES */}
          {activeTab === "reviews" && (
            <div>
              {reviews.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reviews.map((rev: any) => {
                    const targetName =
                      getLocalized(
                        rev.placeId?.name ||
                          rev.businessId?.name ||
                          rev.place?.name ||
                          rev.business?.name ||
                          rev.targetName ||
                          rev.placeName,
                        language
                      ) || (isEs ? "Lugar Explorado" : "Explored Spot");

                    const placeId =
                      rev.placeId?._id ||
                      rev.placeId?.id ||
                      (typeof rev.placeId === "string" ? rev.placeId : null) ||
                      rev.place?._id ||
                      rev.place?.id;
                    const businessId =
                      rev.businessId?._id ||
                      rev.businessId?.id ||
                      (typeof rev.businessId === "string" ? rev.businessId : null) ||
                      rev.business?._id ||
                      rev.business?.id;
                    const targetId = placeId || businessId;
                    const isBusiness = !placeId && !!businessId;
                    const placeHref = targetId
                      ? isBusiness
                        ? `/places/${targetId}?type=business`
                        : `/places/${targetId}`
                      : null;

                    const reviewText =
                      typeof rev.review === "object"
                        ? getLocalized(rev.review, language)
                        : rev.review;

                    return (
                      <div
                        key={rev._id || rev.id}
                        className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs text-left space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            {placeHref ? (
                              <Link
                                href={placeHref}
                                className="font-bold text-sm text-gray-900 dark:text-slate-100 hover:text-amber-500 dark:hover:text-amber-400 hover:underline transition-colors line-clamp-1 flex items-center gap-1.5 group"
                                title={targetName}
                              >
                                <span>{targetName}</span>
                                <ExternalLink
                                  size={12}
                                  className="text-amber-500 opacity-60 group-hover:opacity-100 transition-opacity"
                                />
                              </Link>
                            ) : (
                              <span className="font-bold text-sm text-gray-900 dark:text-slate-100 line-clamp-1">
                                {targetName}
                              </span>
                            )}

                            <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg text-amber-600 dark:text-amber-400 font-black text-xs shrink-0">
                              <Star size={12} className="fill-amber-400 text-amber-400" />
                              <span>{Number(rev.rating) || 5}</span>
                            </div>
                          </div>

                          {reviewText && (
                            <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed font-normal italic">
                              &ldquo;{reviewText}&rdquo;
                            </p>
                          )}
                        </div>

                        {rev.createdAt && (
                          <div className="pt-2 border-t border-gray-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-gray-400 dark:text-slate-500">
                            <span>{isEs ? "Publicado:" : "Published:"}</span>
                            <span>{formatDate(rev.createdAt)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-10 sm:p-14 rounded-3xl bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 text-center space-y-3 shadow-xs">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                    <Star size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                    {isEs ? "Sin reseñas aún" : "No reviews yet"}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
                    {isEs
                      ? "Este explorador aún no ha compartido reseñas sobre los lugares visitados."
                      : "This explorer has not shared reviews about visited places yet."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isOwner && (
        <ProfileUpdateModal
          data={myProfile || data}
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
        />
      )}
    </main>
  );
}
