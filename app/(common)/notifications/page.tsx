"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useAppSelector } from "@/redux/hook";
import {
  useGetMyNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useArchiveNotificationMutation,
  useClearMyNotificationsMutation,
  INotificationItem,
} from "@/redux/features/notification/notificationApi";
import { useGetProfileQuery } from "@/redux/features/user/userApi";
import { getSocket, emitWhenReady } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bell,
  CheckCheck,
  Search,
  Check,
  Archive,
  ArrowRight,
  Sparkles,
  Trash2,
  X,
  BellRing,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getNotificationPermission,
  requestNotificationPermission,
  showDesktopNotification,
} from "@/lib/push-notification";
import {
  formatRelativeTime,
  getNotificationText,
  getVisibleNotification,
  getNotificationIconConfig,
} from "@/components/shared/notifications/notification-helpers";

export default function NotificationsPage() {
  const { t, language } = useLanguage();
  const isAuthenticated = useAppSelector((state) => state.auth.accessToken);

  const [activeCategory, setActiveCategory] = useState<"all" | "roadtripeado" | "account">("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: notifData,
    isLoading,
    refetch,
  } = useGetMyNotificationsQuery(
    {
      category: activeCategory === "all" ? undefined : activeCategory,
      isRead: unreadOnly ? false : undefined,
      searchTerm: searchTerm.trim() || undefined,
      limit: 50,
    },
    { skip: !isAuthenticated }
  );

  const { currentData: user } = useGetProfileQuery({}, { skip: !isAuthenticated });

  const { data: unreadCounts, refetch: refetchUnread } = useGetUnreadCountQuery(
    undefined,
    { skip: !isAuthenticated }
  );

  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead, { isLoading: isMarkingAll }] = useMarkAllAsReadMutation();
  const [archiveNotification] = useArchiveNotificationMutation();
  const [clearMyNotifications, { isLoading: isClearing }] = useClearMyNotificationsMutation();

  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setPushPermission(getNotificationPermission());
  }, []);

  const handleEnablePush = async () => {
    const perm = await requestNotificationPermission();
    setPushPermission(perm);
    if (perm === "granted") {
      toast.success(
        language === "es"
          ? "¡Notificaciones de escritorio activadas!"
          : "Desktop push notifications enabled!"
      );
      showDesktopNotification(
        language === "es" ? "¡Push Activado en PC! 🚀" : "Desktop Push Active! 🚀",
        {
          body:
            language === "es"
              ? "Ahora recibirás alertas emergentes en tu PC al instante."
              : "You will now receive instant desktop push alerts on your PC.",
          url: "/notifications",
        }
      );
    } else if (perm === "denied") {
      toast.error(
        language === "es"
          ? "Las notificaciones están bloqueadas en tu navegador. Habilítalas en los ajustes del sitio."
          : "Notifications are blocked by your browser. Please allow them in site settings."
      );
    }
  };


  const handleClearRead = async () => {
    try {
      await clearMyNotifications({ onlyRead: true }).unwrap();
      toast.success(
        language === "es"
          ? "Notificaciones leídas eliminadas"
          : "Read notifications cleared"
      );
    } catch {
      toast.error(
        language === "es"
          ? "Error al borrar las notificaciones leídas"
          : "Failed to clear read notifications"
      );
    }
  };

  // Real-time socket sync
  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getSocket();
    if (!socket) return;

    if (user?._id) {
      emitWhenReady("join-room", user._id);
    }

    const handleUpdate = (payload?: any) => {
      refetch();
      refetchUnread();
      const notif = payload?.data ? getVisibleNotification(payload.data, user) : undefined;
      if (notif) {
        const titleStr = getNotificationText(notif.title, language) || "Roadtripeado";
        const contentStr = getNotificationText(notif.content, language);
        showDesktopNotification(titleStr, {
          body: contentStr,
          url: notif.actionUrl || "/notifications",
        });
      }
    };

    socket.on("notification", handleUpdate);
    socket.on("unread_count_update", handleUpdate);

    return () => {
      socket.off("notification", handleUpdate);
      socket.off("unread_count_update", handleUpdate);
    };
  }, [isAuthenticated, user, refetch, refetchUnread, language]);

  const rawNotifs = notifData as any;
  const notifications: INotificationItem[] = (Array.isArray(rawNotifs)
    ? rawNotifs
    : (Array.isArray(rawNotifs?.data) ? rawNotifs.data : [])).map((item: INotificationItem) => getVisibleNotification(item, user));

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead({
        category: activeCategory === "all" ? undefined : activeCategory,
      }).unwrap();
      toast.success(
        t("notifications_page.notifications_updated") ||
          (language === "es"
            ? "Todas las notificaciones marcadas como leídas"
            : "All notifications marked as read")
      );
    } catch {
      toast.error(
        language === "es"
          ? "Error al marcar todo como leído"
          : "Failed to mark all as read"
      );
    }
  };

  const handleItemClick = (item: INotificationItem) => {
    if (!item.isRead) {
      markAsRead(item._id);
    }
  };

  const handleArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await archiveNotification(id).unwrap();
      toast.success(
        language === "es"
          ? "Notificación archivada"
          : "Notification archived"
      );
    } catch {
      toast.error(
        language === "es"
          ? "Error al archivar la notificación"
          : "Failed to archive notification"
      );
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <div className="p-4 bg-yellow-100 dark:bg-yellow-950/40 rounded-full text-yellow-600 mb-4">
          <Bell size={40} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
          {t("notifications_page.notification_center") || t("notifications_page.title") || "Notification Center"}
        </h1>
        <p className="text-gray-600 dark:text-slate-400 max-w-md mb-6 text-sm">
          {t("notifications_page.login_prompt") ||
            "Please log in to your account to view your personalized Roadtripeado updates, rewards, offers, and account notifications."}
        </p>
        <Link href="/login">
          <Button className="bg-[#FFC107] hover:bg-[#FFB300] text-black font-bold px-8 py-5 rounded-xl shadow-sm">
            {t("nav.login") || "Log In"}
          </Button>
        </Link>
      </div>
    );
  }

  const totalUnread = unreadCounts?.totalUnread ?? 0;
  const unreadRoadtripeado = unreadCounts?.unreadRoadtripeado ?? 0;
  const unreadAccount = unreadCounts?.unreadAccount ?? 0;

  return (
    <div className="min-h-[80vh] bg-[#F9FAFB] dark:bg-[#0b0f19] py-6 sm:py-10 pb-24 sm:pb-16 transition-colors font-inter">
      <div className="max-w-360 mx-auto px-4 md:px-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center justify-between sm:justify-start gap-3.5 w-full sm:w-auto">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="size-11 sm:size-14 p-2.5 sm:p-3 bg-yellow-400/20 text-yellow-700 dark:text-yellow-400 rounded-2xl border border-yellow-400/30 shrink-0 flex items-center justify-center">
                <Bell size={22} className="sm:size-7" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
                  <span className="truncate">{t("notifications_page.notification_center") || t("notifications_page.title") || "Notification Center"}</span>
                  {totalUnread > 0 && (
                    <span className="text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-full bg-red-500 text-white shadow-xs shrink-0">
                      {totalUnread} {t("notifications_page.new") || "new"}
                    </span>
                  )}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1 hidden sm:block">
                  {t("notifications_page.subtitle") ||
                    "Updates on new offers, maps, approved reviews, unlocked levels, and rewards tailored to you."}
                </p>
              </div>
            </div>

            {/* Mobile Top Action Buttons (Right side of header) */}
            <div className="flex sm:hidden items-center gap-1.5 shrink-0">
              {totalUnread > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllRead}
                  disabled={isMarkingAll}
                  className="h-8 px-2.5 text-xs font-semibold rounded-xl border-gray-300 dark:border-slate-700 bg-white dark:bg-[#131b2e] text-gray-700 dark:text-slate-200"
                  title={t("notifications_page.mark_all_read") || "Mark all as read"}
                >
                  <CheckCheck size={14} className="text-emerald-500" />
                </Button>
              )}
              {notifications.some((n) => n.isRead) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearRead}
                  disabled={isClearing}
                  className="h-8 px-2 text-xs font-semibold rounded-xl text-gray-500 hover:text-red-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                  title={t("notifications_page.clear_read") || "Clear read"}
                >
                  <Trash2 size={14} className="mr-1" />
                  <span className="text-xs">{t("notifications_page.clear_read") || "Clear"}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-2.5 shrink-0">

            {totalUnread > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
                className="rounded-xl border-gray-300 dark:border-slate-700 bg-white dark:bg-[#131b2e] hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-2xs cursor-pointer h-10 px-4"
              >
                {isMarkingAll ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <CheckCheck size={16} className="text-emerald-500" />
                )}
                <span>{t("notifications_page.mark_all_read") || "Mark all as read"}</span>
              </Button>
            )}

            {notifications.some((n) => n.isRead) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearRead}
                disabled={isClearing}
                className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/30 dark:hover:text-red-400 text-gray-600 dark:text-slate-300 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer h-10 px-4 shadow-2xs"
              >
                {isClearing ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                <span>{t("notifications_page.clear_read") || "Clear read"}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Desktop Push Notification Banner (If permission not yet granted or denied) */}
        {pushPermission === "default" && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <BellRing size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100">
                  {language === "es" ? "Habilitar notificaciones en tu PC" : "Enable Push Notifications on your PC"}
                </h4>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                  {language === "es"
                    ? "Recibe alertas emergentes directamente en tu computadora cuando lleguen ofertas y premios."
                    : "Receive instant desktop popups on your PC when new offers, rewards, and updates arrive."}
                </p>
              </div>
            </div>
            <Button
              onClick={handleEnablePush}
              className="bg-[#FFC107] hover:bg-[#FFB300] text-black font-bold text-xs sm:text-sm rounded-xl px-4 py-2 shrink-0 shadow-2xs cursor-pointer"
            >
              {language === "es" ? "Activar en PC" : "Enable on PC"}
            </Button>
          </div>
        )}

        {pushPermission === "denied" && (
          <div className="flex items-center gap-3 p-3.5 mb-6 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-xs text-red-700 dark:text-red-300">
            <AlertCircle size={18} className="shrink-0" />
            <span>
              {language === "es"
                ? "Las notificaciones de escritorio están bloqueadas en este navegador. Haz clic en el ícono de candado junto a la URL para permitirlas."
                : "Desktop notifications are blocked by your browser. Click the lock/tune icon in the browser address bar to allow notifications."}
            </span>
          </div>
        )}

        {/* Search & Unread Filter */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <Input
              type="text"
              placeholder={t("notifications_page.search_placeholder") || "Search notifications..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-10 py-2.5 h-12 text-sm sm:text-base bg-white dark:bg-[#131b2e] border-gray-200 dark:border-slate-800 rounded-2xl w-full shadow-2xs focus:ring-2 focus:ring-yellow-400/30"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`shrink-0 px-4 sm:px-5 h-12 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 border shadow-2xs ${
              unreadOnly
                ? "bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300 font-bold"
                : "bg-white dark:bg-[#131b2e] border-gray-200/90 dark:border-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/80"
            }`}
          >
            <span className={`size-2 rounded-full ${unreadOnly ? "bg-blue-600 dark:bg-blue-400" : "bg-gray-400"}`} />
            <span>{t("notifications_page.unread_only") || "Unread only"}</span>
            {totalUnread > 0 && (
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                unreadOnly
                  ? "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300"
              }`}>
                {totalUnread}
              </span>
            )}
          </button>
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="space-y-3 sm:space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 sm:p-5 md:p-6 bg-white dark:bg-[#131b2e] rounded-2xl border border-gray-100 dark:border-slate-800 animate-pulse"
              >
                <div className="hidden sm:block size-11 md:size-12 rounded-2xl bg-gray-200 dark:bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded-full w-20" />
                    <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded w-24" />
                  </div>
                  <div className="h-5 bg-gray-200 dark:bg-slate-800 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 sm:p-20 bg-white dark:bg-[#131b2e] rounded-3xl border border-gray-200/80 dark:border-slate-800 text-center">
            <div className="size-16 sm:size-20 rounded-3xl bg-yellow-100/60 dark:bg-yellow-950/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400 mb-5">
              <Bell size={32} />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100 mb-1.5">
              {t("notifications_page.no_notifications") || "No notifications found"}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 max-w-md">
              {unreadOnly
                ? (t("notifications_page.no_unread") || "You're all caught up! No unread notifications right now.")
                : (t("notifications_page.no_updates") || "You don't have any updates right now. Check back soon for new offers, maps, and rewards.")}
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {notifications.map((item) => {
              const { icon: Icon, bgColor, badgeColor, label } = getNotificationIconConfig(
                item.type,
                item.category,
                t
              );
              const title = getNotificationText(item.title, language);
              const content = getNotificationText(item.content, language);
              const actionText = getNotificationText(item.actionText, language);

              return (
                <div
                  key={item._id}
                  onClick={() => handleItemClick(item)}
                  className={`group relative flex items-start gap-3.5 sm:gap-4 md:gap-5 p-4 sm:p-5 md:p-6 bg-white dark:bg-[#131b2e] rounded-2xl border transition-all duration-200 cursor-pointer ${
                    item.isRead
                      ? "border-gray-200/70 dark:border-slate-800/80 hover:border-gray-300 dark:hover:border-slate-700 shadow-2xs hover:shadow-xs"
                      : "border-blue-200/90 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/15 shadow-xs"
                  }`}
                >
                  {/* Left Icon: hidden on mobile, visible on sm and up */}
                  <div
                    className={`hidden sm:flex size-11 md:size-12 rounded-2xl items-center justify-center border shrink-0 mt-0.5 ${bgColor}`}
                  >
                    <Icon className="size-5 md:size-6" />
                  </div>

                  {/* Card Main Body */}
                  <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                    <div className="flex-1 min-w-0 pr-0 md:pr-4">
                      {/* Top Row: Category + Time on left */}
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${badgeColor}`}
                        >
                          {label}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-slate-500">
                          {formatRelativeTime(item.createdAt, language)}
                        </span>
                        {!item.isRead && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                            <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
                            {t("notifications_page.new") || "New"}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4
                        className={`text-base sm:text-lg text-gray-900 dark:text-slate-100 break-words leading-snug ${
                          !item.isRead ? "font-extrabold" : "font-bold"
                        }`}
                      >
                        {title}
                      </h4>

                      {/* Content */}
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 mt-1 leading-relaxed break-words max-w-4xl">
                        {content}
                      </p>
                    </div>

                    {/* Right side: Action CTA Button & Quick Action Icons */}
                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2.5 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-slate-800/80">
                      {item.actionUrl && (
                        <Link
                          href={item.actionUrl}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!item.isRead) markAsRead(item._id);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-900 bg-[#FFC107] hover:bg-[#FFB300] active:scale-95 px-4 py-2 rounded-xl shadow-2xs transition-all"
                        >
                          <span>{actionText || t("notifications_page.view_details") || "View details"}</span>
                          <ArrowRight size={14} />
                        </Link>
                      )}

                      <div className="flex items-center gap-1 ml-auto md:ml-0">
                        {!item.isRead && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(item._id);
                            }}
                            className="size-8 flex items-center justify-center text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={t("notifications_page.mark_read") || "Mark as read"}
                          >
                            <Check size={16} />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleArchive(e, item._id)}
                          className="size-8 flex items-center justify-center text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title={t("notifications_page.archive") || "Archive notification"}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
