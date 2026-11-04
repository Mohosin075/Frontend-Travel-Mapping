"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useGetUserByIdQuery,
  useUpdateUserMapAccessMutation,
} from "@/redux/features/user/userApi";
import { appAlert } from "@/lib/app-alert";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getLocalized, getImageUrl, getProfileImageUrl } from "@/lib/utils";
import {
  ArrowLeft,
  Map as MapIcon,
  Gift,
  Award as AwardIcon,
  MessageSquare,
  Sparkles,
  Calendar,
  Mail,
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  Activity,
  MapPin,
  Star,
  Ticket,
  Ban,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function UserDetailPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const userId = (params?.id as string) || "";

  const [activeTab, setActiveTab] = useState<
    "activity" | "maps" | "prizes" | "contributions"
  >("activity");
  const [isPlacesExpanded, setIsPlacesExpanded] = useState(false);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);

  const { data: user, isLoading, isError } = useGetUserByIdQuery(userId, {
    skip: !userId,
  });

  const [updateUserMapAccess, { isLoading: isUpdatingMapAccess }] =
    useUpdateUserMapAccessMutation();

  const formatDate = (dateStr?: string | Date) => {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const levelInfo = user?.levelInfo || {};
  const purchasedMaps = user?.purchasedMaps || [];
  const deactivatedMaps = user?.deactivatedMaps || [];
  const offerRedemptions = user?.offerRedemptions || [];
  const awards = user?.awards || [];
  const unlockedAwards = (awards as any[])
    .filter((a: any) => Boolean(a.isUnlocked))
    .sort((a: any, b: any) => {
      const targetA = Number(a.target || a.configId?.target || 0);
      const targetB = Number(b.target || b.configId?.target || 0);
      if (targetA !== targetB) return targetA - targetB;
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateA - dateB;
    });
  const reviews = user?.reviews || [];
  const visitedPlaces = user?.visitedPlaces || [];
  const activitySummary = user?.activitySummary || {};
  const activityTimeline = user?.activityTimeline || [];



  const handleDeactivateMap = async (mapItem: any) => {
    if (!userId) return;
    const mapId = mapItem._id || mapItem.id;
    const mapName = getLocalized(mapItem.name, language) || "this map";
    const result = await appAlert.fire({
      title: "Remove Map Access?",
      text: `Are you sure you want to deactivate access to "${mapName}" for ${
        user?.name || "this user"
      }? (e.g. refund or invitation revocation)`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, Deactivate",
    });

    if (result.isConfirmed) {
      try {
        await updateUserMapAccess({
          userId,
          mapId,
          action: "deactivate",
        }).unwrap();
        toast.success(`Access to "${mapName}" has been deactivated.`);
      } catch (err: any) {
        toast.error(err?.data?.message || "Failed to deactivate map access");
      }
    }
  };

  const handleReactivateMap = async (mapItem: any) => {
    if (!userId) return;
    const mapId = mapItem._id || mapItem.id;
    const mapName = getLocalized(mapItem.name, language) || "this map";
    const result = await appAlert.fire({
      title: "Reactivate Map Access?",
      text: `Restore access to "${mapName}" for ${user?.name || "this user"}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#059669",
      confirmButtonText: "Yes, Reactivate",
    });

    if (result.isConfirmed) {
      try {
        await updateUserMapAccess({
          userId,
          mapId,
          action: "reactivate",
        }).unwrap();
        toast.success(`Access to "${mapName}" has been restored.`);
      } catch (err: any) {
        toast.error(err?.data?.message || "Failed to reactivate map access");
      }
    }
  };



  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-gray-500 dark:text-slate-400">
          Loading user profile...
        </p>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <p className="text-base font-semibold text-gray-700 dark:text-slate-300">
          User profile not found.
        </p>
        <Link href="/dashboard/users-roles">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft size={16} />
            <span>Back to Users & Roles</span>
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/users-roles"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back to Users & Roles</span>
        </Link>
      </div>

      {/* Main User Header Card */}
      <Card className="p-6 bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 shadow-xs rounded-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20 border-2 border-gray-200 dark:border-slate-700 shadow-sm">
              <AvatarImage src={getProfileImageUrl(user.profile)} alt={user.name} />
              <AvatarFallback />
            </Avatar>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {user.name || "Unknown User"}
                </h1>
                <Badge className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-xs font-bold uppercase tracking-wider">
                  {user.role}
                </Badge>
                <Badge
                  className={`text-xs font-bold uppercase tracking-wider ${
                    user.status === "active"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                      : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                  }`}
                >
                  {user.status}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <Mail size={14} className="text-gray-400 dark:text-slate-500" />
                  {user.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-gray-400 dark:text-slate-500" />
                  Joined: {formatDate(user.createdAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-gray-400 dark:text-slate-500" />
                  Last Active:{" "}
                  {formatDate(
                    activitySummary.lastActivityAt ||
                      user.updatedAt ||
                      user.createdAt
                  )}
                </span>
                {user.country && (
                  <span className="flex items-center gap-1.5">
                    <Globe size={14} className="text-gray-400 dark:text-slate-500" />
                    {user.country}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-slate-800">
          <div className="bg-gray-50/70 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
            <p className="text-[11px] uppercase font-bold text-gray-500 dark:text-slate-400 tracking-wider">
              Level & Tier
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-1">
              Nvl {levelInfo?.levelNumber ?? user.level ?? 0}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold truncate mt-0.5">
              {typeof levelInfo?.title === "string"
                ? levelInfo.title
                : getLocalized(levelInfo?.name, language) || "Explorador"}
            </p>
          </div>

          <div className="bg-gray-50/70 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
            <p className="text-[11px] uppercase font-bold text-gray-500 dark:text-slate-400 tracking-wider">
              XP Points
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-1">
              {user.points || 0} XP
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              {user.totalReviewsApproved || 0} Reviews Approved
            </p>
          </div>

          <div className="bg-gray-50/70 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
            <p className="text-[11px] uppercase font-bold text-gray-500 dark:text-slate-400 tracking-wider">
              Places Visited
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-1">
              {activitySummary.totalPlacesVisited ?? visitedPlaces.length}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Spots Explored
            </p>
          </div>

          <div className="bg-gray-50/70 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
            <p className="text-[11px] uppercase font-bold text-gray-500 dark:text-slate-400 tracking-wider">
              Activated Maps
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-1">
              {purchasedMaps.length}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              {offerRedemptions.length} Offers Claimed
            </p>
          </div>
        </div>

        {/* Level XP Progress Bar */}
        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold mb-2 text-gray-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-yellow-500" />
              <span>
                Nvl {levelInfo?.levelNumber ?? user.level ?? 0}:{" "}
                {typeof levelInfo?.title === "string"
                  ? levelInfo.title
                  : getLocalized(levelInfo?.name, language) || "Explorador"}
              </span>
            </span>
            <span>
              {levelInfo?.nextLevel ? (
                <span>
                  <span className="font-bold text-gray-900 dark:text-slate-100">
                    {user.points || 0}
                  </span>{" "}
                  / {levelInfo.nextLevel.pointsRequired} XP (
                  {levelInfo.progressPercent ?? 0}%)
                </span>
              ) : (
                <span className="text-emerald-600 font-bold">
                  Max Level Reached ({user.points || 0} XP)
                </span>
              )}
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{
                width: `${
                  levelInfo?.nextLevel
                    ? Math.max(3, levelInfo?.progressPercent ?? 0)
                    : 100
                }%`,
              }}
            />
          </div>
        </div>
      </Card>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 p-1 bg-gray-100 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("activity")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "activity"
              ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
              : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
          }`}
        >
          <Activity size={15} />
          <span>User Activity</span>
        </button>

        <button
          onClick={() => setActiveTab("maps")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "maps"
              ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
              : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
          }`}
        >
          <MapIcon size={15} />
          <span>Activated Maps ({purchasedMaps.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("prizes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "prizes"
              ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
              : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
          }`}
        >
          <Gift size={15} />
          <span>Prizes & Rewards</span>
        </button>

        <button
          onClick={() => setActiveTab("contributions")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "contributions"
              ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
              : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200"
          }`}
        >
          <MessageSquare size={15} />
          <span>Contributions ({reviews.length})</span>
        </button>
      </div>

      {/* Tab 1: User Activity */}
      {activeTab === "activity" && (
        <div className="space-y-6">
          <Card className="p-6 bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 shadow-xs rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <MapPin size={16} className="text-blue-600" />
                <span>Places Visited & Viewed ({visitedPlaces.length})</span>
              </h2>
            </div>

            {visitedPlaces.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-slate-500 text-sm">
                <MapPin size={28} className="mx-auto mb-2 opacity-30 text-blue-600" />
                No places marked as visited yet.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(isPlacesExpanded ? visitedPlaces : visitedPlaces.slice(0, 6)).map((vp: any, idx: number) => {
                  const placeName = vp.place?.name
                    ? getLocalized(vp.place.name, language)
                    : vp.business?.name
                    ? getLocalized(vp.business.name, language)
                    : "Explored Spot";
                  const placeAddress =
                    vp.place?.address ||
                    vp.place?.country ||
                    vp.business?.location?.city ||
                    "";
                  const image = vp.place?.media?.[0];
                  const targetId =
                    vp.place?._id ||
                    vp.place?.id ||
                    vp.business?._id ||
                    vp.business?.id;
                  const isBiz = !vp.place?._id && !!vp.business?._id;
                  const targetHref = targetId
                    ? isBiz
                      ? `/places/${targetId}?type=business`
                      : `/places/${targetId}`
                    : null;

                  return (
                    <div
                      key={vp._id || idx}
                      className="bg-gray-50/70 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 p-3 rounded-xl flex items-center gap-3 hover:border-blue-200 dark:hover:border-blue-900 transition-colors"
                    >
                      <div className="w-11 h-11 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0 overflow-hidden border border-blue-100 dark:border-blue-900/30">
                        {image ? (
                          <img
                            src={getImageUrl(image)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <MapPin size={18} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        {targetHref ? (
                          <Link
                            href={targetHref}
                            target="_blank"
                            className="text-xs font-bold text-gray-900 dark:text-slate-100 hover:text-blue-600 hover:underline transition-colors block truncate"
                            title={placeName}
                          >
                            {placeName} ↗
                          </Link>
                        ) : (
                          <p className="text-xs font-bold text-gray-900 dark:text-slate-100 truncate">
                            {placeName}
                          </p>
                        )}
                        {placeAddress && (
                          <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">
                            {placeAddress}
                          </p>
                        )}
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                          {formatDate(vp.visitedAt || vp.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {visitedPlaces.length > 6 && (
                <div className="pt-2 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPlacesExpanded(!isPlacesExpanded)}
                    className="text-xs font-semibold flex items-center gap-1.5 rounded-lg border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <span>
                      {isPlacesExpanded
                        ? (t("common.see_less") || "See less")
                        : `${t("common.see_more") || "See more"} (${visitedPlaces.length - 6} ${t("reports_admin.more") || "more"})`}
                    </span>
                    {isPlacesExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>

          {/* Activity Timeline */}
          <Card className="p-6 bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 shadow-xs rounded-2xl space-y-4">
            <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Activity size={16} className="text-blue-600" />
              <span>Recent User Activity</span>
            </h2>

            {activityTimeline.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-slate-500 text-sm">
                No recent activity recorded.
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {(isTimelineExpanded ? activityTimeline : activityTimeline.slice(0, 5)).map((act: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-gray-50/70 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 p-3.5 rounded-xl flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      {act.type === "place_visit" && <MapPin size={16} />}
                      {act.type === "review_submitted" && <Star size={16} />}
                      {act.type === "offer_claimed" && <Ticket size={16} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                          {act.title}
                        </span>
                        <span className="text-[11px] text-gray-400 dark:text-slate-500 shrink-0">
                          {formatDate(act.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-slate-100 truncate mt-0.5">
                        {act.name}
                      </p>
                      {act.comment && (
                        <p className="text-xs text-gray-600 dark:text-slate-300 italic mt-1">
                          "{act.comment}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {activityTimeline.length > 5 && (
                <div className="pt-2 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
                    className="text-xs font-semibold flex items-center gap-1.5 rounded-lg border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <span>
                      {isTimelineExpanded
                        ? (t("common.see_less") || "See less")
                        : `${t("common.see_more") || "See more"} (${activityTimeline.length - 5} ${t("reports_admin.more") || "more"})`}
                    </span>
                    {isTimelineExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
        </div>
      )}

      {/* Tab 2: Activated Maps & Access Control */}
      {activeTab === "maps" && (
        <Card className="p-6 bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 shadow-xs rounded-2xl space-y-6">
          <div className="pb-4 border-b border-gray-100 dark:border-slate-800">
            <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">
              Active Maps ({purchasedMaps.length})
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Manage map access, or deactivate access in case of refunds or invitation revocations.
            </p>
          </div>

          {/* Active Maps Grid */}
          {purchasedMaps.length === 0 ? (
            <div className="p-10 text-center text-gray-400 dark:text-slate-500 text-sm">
              <MapIcon size={32} className="mx-auto mb-2 opacity-30 text-blue-600" />
              No active maps for this user.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {purchasedMaps.map((mapItem: any) => (
                <div
                  key={mapItem._id}
                  className="bg-white dark:bg-[#0b0f19] border border-gray-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-4 shadow-xs hover:border-blue-200 dark:hover:border-blue-900 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-400 shrink-0 overflow-hidden">
                      {mapItem.coverPhoto || mapItem.images?.[0] ? (
                        <img
                          src={getImageUrl(mapItem.coverPhoto || mapItem.images?.[0])}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <MapIcon size={24} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">
                          {getLocalized(mapItem.name, language)}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                        {mapItem.country || "Puerto Rico"}
                      </p>
                      <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] mt-2">
                        Active
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-slate-800/80 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeactivateMap(mapItem)}
                      disabled={isUpdatingMapAccess}
                      className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 flex items-center gap-1.5 cursor-pointer"
                      title="Deactivate map access (e.g. for refund or revocation)"
                    >
                      <Ban size={13} />
                      <span>Deactivate / Revoke</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Deactivated Maps Section */}
          {deactivatedMaps.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-2">
                  <Ban size={15} />
                  <span>Deactivated / Refunded Maps ({deactivatedMaps.length})</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  These maps were previously revoked or refunded. Click Reactivate to restore access.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deactivatedMaps.map((mapItem: any) => (
                  <div
                    key={mapItem._id}
                    className="bg-gray-50/60 dark:bg-slate-900/30 border border-dashed border-gray-200 dark:border-slate-700/80 rounded-xl p-4 flex flex-col justify-between gap-4 opacity-90 hover:opacity-100 transition-opacity"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-400 shrink-0 overflow-hidden grayscale">
                        {mapItem.coverPhoto || mapItem.images?.[0] ? (
                          <img
                            src={getImageUrl(mapItem.coverPhoto || mapItem.images?.[0])}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <MapIcon size={24} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-700 dark:text-slate-300 truncate">
                          {getLocalized(mapItem.name, language)}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                          {mapItem.country || "Puerto Rico"}
                        </p>
                        <Badge className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 text-[10px] mt-2">
                          Inactive
                        </Badge>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-200/60 dark:border-slate-800/60 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReactivateMap(mapItem)}
                        disabled={isUpdatingMapAccess}
                        className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw size={13} />
                        <span>Reactivate Access</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


        </Card>
      )}

      {/* Tab 3: Prizes & Rewards */}
      {activeTab === "prizes" && (
        <Card className="p-6 bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 shadow-xs rounded-2xl space-y-6">
          {/* Claimed Free Map */}
          {user.redeemedFreeMap && (
            <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/60 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Gift size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-900 dark:text-blue-300">
                    Free Map Claimed Reward
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold">
                    {getLocalized(user.redeemedFreeMap.name, language)}
                  </p>
                </div>
              </div>
              <Badge className="bg-blue-600 text-white text-[10px]">
                Claimed
              </Badge>
            </div>
          )}

          {/* Redeemed Offers */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
              Redeemed Offers ({offerRedemptions.length})
            </h3>
            {offerRedemptions.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-slate-500 bg-gray-50/50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-800 p-4 rounded-xl text-center">
                No offers redeemed yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {offerRedemptions.map((item: any) => (
                  <div
                    key={item._id}
                    className="bg-gray-50/70 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-gray-900 dark:text-slate-100">
                        {getLocalized(item.offer?.title, language) || "Special Offer"}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                        {item.offer?.place?.name
                          ? getLocalized(item.offer.place.name, language)
                          : item.offer?.business?.name
                          ? getLocalized(item.offer.business.name, language)
                          : "General Offer"}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">
                      {formatDate(item.createdAt || item.redemptionTime)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Badges & Rewards (Unlocked Prizes only, in order) */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
              {t("rewards_admin.unlocked_badges_rewards") || "Unlocked Badges & Rewards"} ({unlockedAwards.length})
            </h3>
            {unlockedAwards.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-slate-500 bg-gray-50/50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-800 p-4 rounded-xl text-center">
                {t("rewards_admin.no_badges_unlocked") || "No prizes or badges unlocked yet."}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {unlockedAwards.map((awardItem: any) => (
                  <div
                    key={awardItem._id}
                    className="p-3 rounded-xl border flex items-center gap-3 text-xs bg-white dark:bg-[#0b0f19] border-blue-200 dark:border-blue-900/60 shadow-2xs"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 font-bold text-xs">
                      {awardItem.configId?.coverPhoto ? (
                        <img
                          src={getImageUrl(awardItem.configId.coverPhoto)}
                          alt=""
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <AwardIcon size={18} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 dark:text-slate-100 truncate">
                        {getLocalized(awardItem.configId?.title, language) ||
                          awardItem.type}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400">
                        {awardItem.progress} / {awardItem.target} XP
                      </p>
                    </div>
                    <CheckCircle2
                      size={18}
                      className="text-emerald-600 dark:text-emerald-400 shrink-0"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Tab 4: Contributions & Reviews */}
      {activeTab === "contributions" && (
        <Card className="p-6 bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 shadow-xs rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <MessageSquare size={16} className="text-blue-600" />
            <span>Contributions & Reviews ({reviews.length})</span>
          </h2>

          {reviews.length === 0 ? (
            <div className="p-10 text-center text-gray-400 dark:text-slate-500 text-sm">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-30 text-blue-600" />
              No reviews or contributions submitted yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((rev: any) => {
                const targetId =
                  rev.placeId?._id ||
                  rev.placeId?.id ||
                  (typeof rev.placeId === "string" ? rev.placeId : null) ||
                  rev.businessId?._id ||
                  rev.businessId?.id ||
                  (typeof rev.businessId === "string" ? rev.businessId : null);
                const isBiz = !rev.placeId && !!rev.businessId;
                const placeHref = targetId
                  ? isBiz
                    ? `/places/${targetId}?type=business`
                    : `/places/${targetId}`
                  : null;
                const placeName = rev.placeId?.name
                  ? getLocalized(rev.placeId.name, language)
                  : rev.businessId?.name
                  ? getLocalized(rev.businessId.name, language)
                  : "Location Review";

                return (
                  <div
                    key={rev._id}
                    className="bg-gray-50/70 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 p-4 rounded-xl shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      {placeHref ? (
                        <Link
                          href={placeHref}
                          target="_blank"
                          className="text-xs font-bold text-gray-900 dark:text-slate-100 hover:text-blue-600 hover:underline transition-colors flex items-center gap-1 group truncate"
                          title={placeName}
                        >
                          <span className="truncate">{placeName}</span>
                          <span className="text-[10px] text-blue-600 opacity-60 group-hover:opacity-100 transition-opacity">
                            ↗
                          </span>
                        </Link>
                      ) : (
                        <p className="text-xs font-bold text-gray-900 dark:text-slate-100">
                          {placeName}
                        </p>
                      )}
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 font-medium shrink-0">
                        {formatDate(rev.createdAt)}
                      </span>
                    </div>

                    {rev.review && (
                      <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed italic">
                        "{rev.review?.en || rev.review?.es || rev.review}"
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-bold text-yellow-500">
                        ⭐ {rev.rating || 5}.0 Rating
                      </span>
                      <Badge
                        className={`text-[9px] ${
                          rev.status === "Approved"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            : "bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800"
                        }`}
                      >
                        {rev.status || "Approved"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
