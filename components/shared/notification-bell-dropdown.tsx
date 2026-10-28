"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  ArrowRight,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useGetMyNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  INotificationItem,
} from "@/redux/features/notification/notificationApi";
import { getSocket, emitWhenReady } from "@/lib/socket";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { toast } from "sonner";
import { useGetProfileQuery } from "@/redux/features/user/userApi";
import {
  formatRelativeTime,
  getNotificationText,
  getVisibleNotification,
  getNotificationIconConfig,
} from "@/components/shared/notifications/notification-helpers";

interface NotificationBellDropdownProps {
  userId?: string;
  viewAllHref?: string;
  className?: string;
}

export default function NotificationBellDropdown({
  userId,
  viewAllHref = "/notifications",
  className = "",
}: NotificationBellDropdownProps) {
  const router = useRouter();
  const { currentData: user } = useGetProfileQuery({}, { skip: !userId });
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [filterUnread, setFilterUnread] = useState(false);

  const { data: unreadData, refetch: refetchUnread } = useGetUnreadCountQuery(undefined, {
    pollingInterval: 30000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const {
    data: notifData,
    isLoading,
    refetch: refetchNotifs,
  } = useGetMyNotificationsQuery(
    {
      isRead: filterUnread ? false : undefined,
      limit: 8,
    },
    { skip: !open }
  );

  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead, { isLoading: isMarkingAll }] = useMarkAllAsReadMutation();

  const totalUnread = unreadData?.totalUnread ?? 0;

  // Socket sync and instant live toast on new notification
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    if (userId) {
      emitWhenReady("join-room", userId);
    }

    const handleConnect = () => {
      if (userId) {
        emitWhenReady("join-room", userId);
      }
      refetchUnread();
    };

    const handleNewNotification = (payload: any) => {
      refetchUnread();
      refetchNotifs();

      const notif = payload?.data ? getVisibleNotification(payload.data, user) : undefined;
      if (notif) {
        const titleStr = getNotificationText(notif.title, language) || "New Notification";
        const contentStr = getNotificationText(notif.content, language);

        // 1. Rich In-App Toast
        toast.info(titleStr, {
          description: contentStr,
          action: {
            label: t("common.view") || "View",
            onClick: () => {
              if (notif.actionUrl) {
                router.push(notif.actionUrl);
              } else {
                router.push(viewAllHref);
              }
            },
          },
          duration: 6000,
        });

        // 2. Native System Desktop Push Notification
        if (typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "granted") {
            try {
              const desktopNotif = new window.Notification(titleStr, {
                body: contentStr,
                icon: "/logo.png",
              });
              desktopNotif.onclick = () => {
                window.focus();
                if (notif.actionUrl) {
                  router.push(notif.actionUrl);
                } else {
                  router.push(viewAllHref);
                }
              };
            } catch {}
          }
        }
      }
    };

    const handleCountUpdate = () => {
      refetchUnread();
      if (open) refetchNotifs();
    };

    socket.on("connect", handleConnect);
    socket.on("notification", handleNewNotification);
    socket.on("unread_count_update", handleCountUpdate);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("notification", handleNewNotification);
      socket.off("unread_count_update", handleCountUpdate);
    };
  }, [userId, user, open, language, refetchUnread, refetchNotifs, router, viewAllHref]);

  const handleMarkAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markAllAsRead().unwrap();
      toast.success(
        t("notifications_page.all_marked_read") ||
          t("notifications_page.notifications_updated") ||
          "All notifications marked as read"
      );
    } catch {
      toast.error(
        t("notifications_page.mark_read_error") ||
          "Failed to mark notifications as read"
      );
    }
  };

  const handleItemClick = (item: INotificationItem) => {
    if (!item.isRead) {
      markAsRead(item._id);
    }
    setOpen(false);
    if (item.actionUrl) {
      router.push(item.actionUrl);
    }
  };

  const rawNotifs = notifData as any;
  const notifications: INotificationItem[] = (Array.isArray(rawNotifs)
    ? rawNotifs
    : (Array.isArray(rawNotifs?.data) ? rawNotifs.data : [])).map((item: INotificationItem) => getVisibleNotification(item, user));

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (
          nextOpen &&
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "default"
        ) {
          Notification.requestPermission();
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 transition-transform active:scale-95 outline-none cursor-pointer ${className}`}
          title={t("notifications_page.title") || "Notifications"}
          aria-label="Open notifications"
        >
          <Bell className="size-5 transition-transform hover:rotate-12 duration-200" />
          {totalUnread > 0 && (
            <span className="absolute top-0 right-0 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-bold text-white bg-red-500 rounded-full animate-pulse shadow-sm ring-2 ring-white dark:ring-[#0b0f19]">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className="w-[calc(100vw-1.5rem)] sm:w-96 max-w-sm p-0 rounded-2xl border border-gray-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#131b2e]/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-150"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-slate-100">
              {t("notifications_page.title") || "Notifications"}
            </h3>
            {totalUnread > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                {totalUnread} {t("notifications_page.new") || "new"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {totalUnread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={isMarkingAll}
                className="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={t("notifications_page.mark_all_read") || "Mark all as read"}
              >
                {isMarkingAll ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CheckCheck size={14} className="text-emerald-500" />
                )}
                <span className="hidden sm:inline">
                  {t("notifications_page.mark_all_read") || "Mark all read"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 dark:border-slate-800/80 bg-white dark:bg-[#131b2e]">
          <button
            type="button"
            onClick={() => setFilterUnread(false)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              !filterUnread
                ? "bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            {t("notifications_page.all") || "All"}
          </button>
          <button
            type="button"
            onClick={() => setFilterUnread(true)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              filterUnread
                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                : "text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            {t("notifications_page.unread") || "Unread"} ({totalUnread})
          </button>
        </div>

        {/* Items List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800/60">
          {isLoading ? (
            <div className="p-8 flex flex-col items-center justify-center text-gray-400 gap-2">
              <Loader2 size={24} className="animate-spin text-yellow-500" />
              <p className="text-xs">{t("notifications_page.loading") || "Loading updates..."}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-400 dark:text-slate-500">
              <div className="size-10 rounded-full bg-gray-100 dark:bg-slate-800/80 mx-auto flex items-center justify-center mb-2">
                <Bell size={18} className="text-gray-400" />
              </div>
              <p className="text-xs font-semibold">
                {filterUnread
                  ? t("notifications_page.no_unread") || "No unread notifications"
                  : t("notifications_page.no_notifications") || "No notifications yet"}
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const { icon: Icon, bgColor } = getNotificationIconConfig(
                item.type,
                item.category
              );
              const title = getNotificationText(item.title, language);
              const content = getNotificationText(item.content, language);

              return (
                <div
                  key={item._id}
                  onClick={() => handleItemClick(item)}
                  className={`flex items-start gap-3 p-3.5 hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group ${
                    !item.isRead ? "bg-blue-50/30 dark:bg-blue-950/20" : ""
                  }`}
                >
                  <div
                    className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${bgColor}`}
                  >
                    <Icon size={16} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p
                        className={`text-xs font-bold truncate text-gray-900 dark:text-slate-100 ${
                          !item.isRead ? "font-extrabold" : ""
                        }`}
                      >
                        {title}
                      </p>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 shrink-0">
                        {formatRelativeTime(item.createdAt, language)}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {content}
                    </p>
                  </div>

                  {!item.isRead && (
                    <div className="size-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Link */}
        <div className="p-2 border-t border-gray-100 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-900/50 text-center">
          <Link
            href={viewAllHref}
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center gap-1.5 w-full py-2 text-xs font-bold text-gray-700 dark:text-slate-200 hover:text-black dark:hover:text-white rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs"
          >
            <span>{t("notifications_page.view_all") || "View all in Notification Center"}</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
