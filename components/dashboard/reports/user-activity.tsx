"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getImageUrl, getLocalized } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search } from "lucide-react";
import {
  Users,
  TrendingUp,
  Calendar,
  UserCheck,
  MapPin,
  Ticket,
  Star,
  Activity,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  ArrowRight,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface IUserActivityItem {
  id: string;
  type: "visit" | "review" | "redemption" | "registration";
  userId?: string;
  userName: string;
  userEmail?: string;
  userProfile?: string;
  title: string;
  subtitle?: string;
  targetId?: string;
  targetType?: "place" | "business" | "offer" | "map";
  timestamp: string | Date;
}

export interface IActiveUserSummary {
  _id: string;
  name: string;
  email: string;
  profile?: string;
  role?: string;
  level?: number;
  points?: number;
  lastActive: string | Date;
  activityType?: string;
  isActiveToday?: boolean;
  isActiveWeek?: boolean;
  isActiveMonth?: boolean;
  periods?: ('today' | 'week' | 'month' | 'all')[];
}

export interface IUserActivityStats {
  activeUsersToday: number;
  activeUsersThisWeek: number;
  activeUsersThisMonth: number;
  totalRegisteredUsers: number;
  totalPlacesVisited: number;
  totalOffersRedeemed: number;
  totalReviews: number;
  recentActivities: IUserActivityItem[];
  activeUsersList?: IActiveUserSummary[];
  activeTodayList?: IActiveUserSummary[];
  activeWeekList?: IActiveUserSummary[];
  activeMonthList?: IActiveUserSummary[];
  allUsersList?: IActiveUserSummary[];
}

export function UserActivityOverview({ data }: { data?: IUserActivityStats }) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [isActiveUsersModalOpen, setIsActiveUsersModalOpen] = useState(false);
  const [activeTimeframe, setActiveTimeframe] = useState<"today" | "week" | "month" | "all">("today");
  const [searchUserTerm, setSearchUserTerm] = useState("");

  const getSelectedUsers = (): IActiveUserSummary[] => {
    if (activeTimeframe === "today") {
      if (data?.activeTodayList !== undefined) return data.activeTodayList;
      return (data?.activeUsersList || []).filter(
        (u) => u.isActiveToday || u.periods?.includes("today")
      );
    }
    if (activeTimeframe === "week") {
      if (data?.activeWeekList !== undefined) return data.activeWeekList;
      return (data?.activeUsersList || []).filter(
        (u) => u.isActiveWeek || u.periods?.includes("week")
      );
    }
    if (activeTimeframe === "month") {
      if (data?.activeMonthList !== undefined) return data.activeMonthList;
      return (data?.activeUsersList || []).filter(
        (u) => u.isActiveMonth || u.periods?.includes("month")
      );
    }
    // "all"
    if (data?.allUsersList !== undefined) return data.allUsersList;
    return data?.activeUsersList || [];
  };

  const currentTabUsers = getSelectedUsers();

  const filteredUsers = currentTabUsers.filter((u) => {
    if (!searchUserTerm.trim()) return true;
    const term = searchUserTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.role && u.role.toLowerCase().includes(term))
    );
  });

  const handleOpenUserProfile = (userId?: string) => {
    if (!userId) return;
    router.push(`/dashboard/users-roles/${userId}`);
  };

  const handleOpenModalWithFilter = (timeframe: "today" | "week" | "month" | "all") => {
    setActiveTimeframe(timeframe);
    setSearchUserTerm("");
    setIsActiveUsersModalOpen(true);
  };

  const metrics = [
    {
      timeframe: "today" as const,
      label: t("reports_admin.active_today") || "Active Today (24h)",
      value: data?.activeUsersToday?.toLocaleString() || "0",
      subtext: t("reports_admin.active_today_sub") || "Active users in last 24h",
      icon: <Users size={20} />,
      iconBgColor: "bg-amber-500",
      clickable: true,
    },
    {
      timeframe: "week" as const,
      label: t("reports_admin.active_this_week") || "Active This Week (7d)",
      value: data?.activeUsersThisWeek?.toLocaleString() || "0",
      subtext: t("reports_admin.active_week_sub") || "Active users in last 7 days",
      icon: <TrendingUp size={20} />,
      iconBgColor: "bg-amber-600",
      clickable: true,
    },
    {
      timeframe: "month" as const,
      label: t("reports_admin.active_this_month") || "Active This Month (30d)",
      value: data?.activeUsersThisMonth?.toLocaleString() || "0",
      subtext: t("reports_admin.active_month_sub") || "Active users in last 30 days",
      icon: <Calendar size={20} />,
      iconBgColor: "bg-amber-700",
      clickable: true,
    },
    {
      timeframe: "all" as const,
      label: t("reports_admin.total_registered") || "Total Registered Users",
      value: data?.totalRegisteredUsers?.toLocaleString() || "0",
      subtext: t("reports_admin.total_users_sub") || "Total platform accounts",
      icon: <UserCheck size={20} />,
      iconBgColor: "bg-emerald-600",
      clickable: true,
    },
  ];

  const timeframeTitles = {
    today: t("reports_admin.active_today_title") || "Active Users Today (Last 24h)",
    week: t("reports_admin.active_week_title") || "Active Users This Week (Last 7 Days)",
    month: t("reports_admin.active_month_title") || "Active Users This Month (Last 30 Days)",
    all: t("reports_admin.all_users_title") || "All Registered Users",
  };

  return (
    <div className="space-y-4">
      {/* Section Header with Quick Active Users Inspection CTA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-amber-600 dark:text-amber-400" />
          <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
            {t("reports_admin.user_overview") || "User Overview"}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => handleOpenModalWithFilter("today")}
          className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg border border-amber-500/20 transition-all inline-flex items-center gap-1.5 cursor-pointer"
        >
          <UserCheck size={13} />
          <span>{t("reports_admin.view_active_profiles") || "View Active Users & Profiles"}</span>
        </button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((stat, idx) => (
          <div
            key={idx}
            onClick={() => stat.clickable && handleOpenModalWithFilter(stat.timeframe)}
            className={`bg-white dark:bg-[#131b2e] p-5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm transition-all ${
              stat.clickable
                ? "cursor-pointer hover:border-amber-400/80 hover:shadow-md hover:-translate-y-0.5 group"
                : ""
            }`}
            title={stat.clickable ? (t("reports_admin.click_to_view_users") || "Click to view relevant users") : undefined}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-gray-500 dark:text-slate-400 text-xs font-semibold mb-1 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  {stat.label}
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100">
                  {stat.value}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1 truncate">
                  {stat.subtext}
                </p>
              </div>

              <div
                className={`${stat.iconBgColor} text-white rounded-xl p-3 shrink-0 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform`}
              >
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Active Users Dialog */}
      <Dialog open={isActiveUsersModalOpen} onOpenChange={setIsActiveUsersModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-3xl bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader className="p-5 pb-3 border-b border-gray-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black text-gray-900 dark:text-white">
                    {timeframeTitles[activeTimeframe]}
                  </DialogTitle>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    {filteredUsers.length} {t("reports_admin.active_users_found") || "user(s) found"}
                  </p>
                </div>
              </div>
            </div>

            {/* Timeframe Filter Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 dark:bg-slate-900 rounded-xl mt-3">
              <button
                type="button"
                onClick={() => setActiveTimeframe("today")}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTimeframe === "today"
                    ? "bg-white dark:bg-[#131b2e] text-amber-600 dark:text-amber-400 shadow-xs border border-gray-200/50 dark:border-slate-800"
                    : "text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <span>{t("reports_admin.tab_today") || "Today"}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  activeTimeframe === "today"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    : "bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-400"
                }`}>
                  {data?.activeUsersToday ?? (data?.activeTodayList?.length || 0)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTimeframe("week")}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTimeframe === "week"
                    ? "bg-white dark:bg-[#131b2e] text-amber-600 dark:text-amber-400 shadow-xs border border-gray-200/50 dark:border-slate-800"
                    : "text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <span>{t("reports_admin.tab_week") || "7 Days"}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  activeTimeframe === "week"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    : "bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-400"
                }`}>
                  {data?.activeUsersThisWeek ?? (data?.activeWeekList?.length || 0)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTimeframe("month")}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTimeframe === "month"
                    ? "bg-white dark:bg-[#131b2e] text-amber-600 dark:text-amber-400 shadow-xs border border-gray-200/50 dark:border-slate-800"
                    : "text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <span>{t("reports_admin.tab_month") || "30 Days"}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  activeTimeframe === "month"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    : "bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-400"
                }`}>
                  {data?.activeUsersThisMonth ?? (data?.activeMonthList?.length || 0)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTimeframe("all")}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTimeframe === "all"
                    ? "bg-white dark:bg-[#131b2e] text-amber-600 dark:text-amber-400 shadow-xs border border-gray-200/50 dark:border-slate-800"
                    : "text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <span>{t("reports_admin.tab_all") || "All Users"}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  activeTimeframe === "all"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    : "bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-400"
                }`}>
                  {data?.totalRegisteredUsers ?? (data?.allUsersList?.length || 0)}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mt-2.5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchUserTerm}
                onChange={(e) => setSearchUserTerm(e.target.value)}
                placeholder={t("reports_admin.search_users_placeholder") || "Search by name, email, or role..."}
                className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
          </DialogHeader>

          {/* Active Users List */}
          <div className="p-4 sm:p-5 overflow-y-auto max-h-[60vh] space-y-2.5">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-10 text-xs text-gray-400 dark:text-slate-500">
                {t("reports_admin.no_active_users_found") || "No users found in this time period."}
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-gray-50/70 dark:bg-slate-900/60 hover:bg-amber-50/60 dark:hover:bg-slate-800/60 border border-gray-100 dark:border-slate-800/80 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      onClick={() => handleOpenUserProfile(user._id)}
                      className="w-10 h-10 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      {user.profile ? (
                        <img
                          src={getImageUrl(user.profile)}
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{user.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOpenUserProfile(user._id)}
                          className="font-bold text-sm text-gray-900 dark:text-slate-100 hover:text-amber-600 dark:hover:text-amber-400 hover:underline cursor-pointer truncate text-left"
                        >
                          {user.name}
                        </button>
                        {user.role && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                            {user.role}
                          </span>
                        )}
                        {user.isActiveToday ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {t("reports_admin.active_today_tag") || "Active Today"}
                          </span>
                        ) : user.isActiveWeek ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            {t("reports_admin.active_week_tag") || "Active This Week"}
                          </span>
                        ) : user.isActiveMonth ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            {t("reports_admin.active_month_tag") || "Active This Month"}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">
                        {user.email || "No email"} · {user.points ?? 0} pts · Level {user.level ?? 0}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenUserProfile(user._id)}
                    className="px-3 py-1.5 rounded-xl bg-[#FFC107] hover:bg-[#e6ad06] text-gray-950 font-black text-xs shadow-xs transition-all active:scale-95 shrink-0 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <UserCheck size={12} />
                    <span>{t("reports_admin.view_profile") || "View Profile"}</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>


      {/* Engagement Quick Strip */}
      <div className="bg-white dark:bg-[#131b2e] rounded-xl border border-gray-200 dark:border-slate-800 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/50 dark:border-amber-800/40">
            <MapPin size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
              {t("reports_admin.places_visited_total") || "Total Places Visited"}
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
              {data?.totalPlacesVisited?.toLocaleString() || "0"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:border-l border-gray-100 dark:border-slate-800 sm:pl-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/50 dark:border-amber-800/40">
            <Ticket size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
              {t("reports_admin.offers_claimed_total") || "Offers Claimed"}
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
              {data?.totalOffersRedeemed?.toLocaleString() || "0"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:border-l border-gray-100 dark:border-slate-800 sm:pl-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/50 dark:border-amber-800/40">
            <Star size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
              {t("reports_admin.reviews_total") || "Reviews Submitted"}
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
              {data?.totalReviews?.toLocaleString() || "0"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RecentUserActivityLog({
  activities = [],
}: {
  activities?: IUserActivityItem[];
}) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleActivities = isExpanded ? activities : activities.slice(0, 5);

  const handleOpenUser = (userId?: string) => {
    if (!userId) return;
    router.push(`/dashboard/users-roles/${userId}`);
  };

  const formatActivityTime = (dateInput: string | Date) => {
    try {
      const date = new Date(dateInput);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (60 * 1000));
      const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

      if (diffMins < 1) return t("common.just_now") || "Just now";
      if (diffMins < 60) return `${diffMins}m ${t("common.ago") || "ago"}`;
      if (diffHours < 24) return `${diffHours}h ${t("common.ago") || "ago"}`;
      if (diffDays < 7) return `${diffDays}d ${t("common.ago") || "ago"}`;

      return date.toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  const getActivityBadge = (type: IUserActivityItem["type"]) => {
    switch (type) {
      case "visit":
        return {
          label: t("reports_admin.place_visited") || "Visited",
          color:
            "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
          Icon: MapPin,
        };
      case "redemption":
        return {
          label: t("reports_admin.offer_redeemed") || "Claimed Offer",
          color:
            "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
          Icon: Ticket,
        };
      case "review":
        return {
          label: t("reports_admin.review_submitted") || "Review",
          color:
            "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60",
          Icon: Star,
        };
      case "registration":
        return {
          label: t("reports_admin.new_user") || "Joined",
          color:
            "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60",
          Icon: UserPlus,
        };
      default:
        return {
          label: t("reports_admin.activity") || "Activity",
          color:
            "bg-gray-50 text-gray-700 border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
          Icon: Activity,
        };
    }
  };

  const getTargetUrl = (activity: IUserActivityItem) => {
    if (!activity.targetId || !activity.targetType) return null;
    switch (activity.targetType) {
      case "place":
        return `/places/${activity.targetId}`;
      case "business":
        return `/dashboard/business/${activity.targetId}`;
      case "offer":
        return `/offer/${activity.targetId}`;
      case "map":
        return `/catalog/${activity.targetId}`;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-[#131b2e] rounded-xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-amber-600 dark:text-amber-400" />
          <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
            {t("reports_admin.recent_activity_title") || "Recent User Activity"}
          </h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400">
            {activities.length}
          </span>
        </div>

        <Link
          href="/dashboard/users-roles"
          className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 inline-flex items-center gap-1 hover:underline"
        >
          <span>{t("reports_admin.view_all_users") || "Manage Users"}</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Activity List */}
      {activities.length === 0 ? (
        <div className="p-8 text-center text-xs text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-900/40 rounded-lg border border-gray-100 dark:border-slate-800 border-dashed">
          {t("reports_admin.no_activity_yet") || "No user activity recorded yet."}
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleActivities.map((act) => {
            const badge = getActivityBadge(act.type);
            const { Icon } = badge;
            const targetUrl = getTargetUrl(act);

            return (
              <div
                key={act.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50/70 dark:bg-slate-900/60 hover:bg-gray-100/70 dark:hover:bg-slate-800/60 rounded-lg border border-gray-100 dark:border-slate-800 transition-all text-xs"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Avatar */}
                  <div
                    onClick={() => handleOpenUser(act.userId)}
                    className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                    title={act.userName}
                  >
                    {act.userProfile ? (
                      <img
                        src={getImageUrl(act.userProfile)}
                        alt={act.userName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{act.userName.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenUser(act.userId)}
                        className="font-bold text-gray-900 dark:text-slate-100 hover:text-amber-600 dark:hover:text-amber-400 hover:underline cursor-pointer truncate max-w-[160px] text-left"
                      >
                        {act.userName}
                      </button>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.color}`}
                      >
                        <Icon size={10} />
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    {act.subtitle && (
                      <div className="flex items-center gap-1.5 mt-0.5 text-gray-600 dark:text-slate-400">
                        {targetUrl ? (
                          <Link
                            href={targetUrl}
                            className="hover:underline hover:text-amber-600 dark:hover:text-amber-400 inline-flex items-center gap-1 font-medium truncate max-w-sm"
                          >
                            <span className="truncate">{act.subtitle}</span>
                            <ExternalLink size={10} className="shrink-0 opacity-70" />
                          </Link>
                        ) : (
                          <span className="truncate max-w-sm">{act.subtitle}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-slate-500 font-medium">
                    <Clock size={11} />
                    <span>{formatActivityTime(act.timestamp)}</span>
                  </div>
                  {act.userId && (
                    <button
                      type="button"
                      onClick={() => handleOpenUser(act.userId)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] font-bold border border-amber-500/20 transition-all inline-flex items-center gap-1 cursor-pointer"
                      title={t("reports_admin.view_profile") || "View Profile"}
                    >
                      <UserCheck size={11} />
                      <span className="hidden sm:inline">{t("reports_admin.profile") || "Profile"}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {activities.length > 5 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg text-amber-700 dark:text-amber-400 bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 border border-amber-200/60 dark:border-amber-800/60 transition-all cursor-pointer"
              >
                <span>
                  {isExpanded
                    ? t("reports_admin.view_less") || "View Less"
                    : `${t("reports_admin.view_more") || "View More"} (${activities.length - 5} ${t("reports_admin.more") || "more"})`}
                </span>
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
