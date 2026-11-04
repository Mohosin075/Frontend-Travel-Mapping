"use client";

import { Button } from "@/components/ui/button";
import { Star, Trophy, Award, MessageSquare, Bell, Check, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  useGetMyNotificationsQuery,
  useMarkAsReadMutation,
  INotificationItem,
} from "@/redux/features/notification/notificationApi";

function formatRelativeTime(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function NotificationMessage() {
  const { t, language } = useLanguage();
  const { data: response, isLoading } = useGetMyNotificationsQuery({
    category: "account",
    limit: 20,
  });
  const [markAsRead] = useMarkAsReadMutation();

  const rawNotifs = response as any;
  const notifications: INotificationItem[] = Array.isArray(rawNotifs)
    ? rawNotifs
    : (Array.isArray(rawNotifs?.data) ? rawNotifs.data : []);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getText = (val: any) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    return val[language] || val.es || val.en || "";
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "APPROVED_REVIEW":
        return <Star size={18} className="text-yellow-500 fill-yellow-500" />;
      case "UNLOCKED_LEVEL":
        return <Trophy size={18} className="text-yellow-500" />;
      case "EARNED_REWARD":
        return <Award size={18} className="text-emerald-500" />;
      case "NEW_MESSAGE":
        return <MessageSquare size={18} className="text-blue-500" />;
      default:
        return <Bell size={18} className="text-indigo-500" />;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Star size={24} className="text-yellow-500" />
          <h2 className="text-xl font-bold text-black dark:text-slate-100 font-inter">
            {t("notifications_page.new_reviews")}
          </h2>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size={"sm"}
            className="text-sm bg-primary/30 hover:bg-primary/30 text-[#A16207] font-semibold rounded-full px-2 py-1!"
          >
            {unreadCount} NEW
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8 bg-white dark:bg-[#131b2e] rounded-lg border border-gray-200 dark:border-slate-800">
          <Loader2 className="animate-spin text-gray-400" size={24} />
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-[#131b2e] rounded-lg border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400">
          <p className="text-sm">No account notifications at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((item) => {
            const title = getText(item.title);
            const content = getText(item.content);
            const actionText = getText(item.actionText);

            return (
              <div
                key={item._id}
                onClick={() => !item.isRead && markAsRead(item._id)}
                className={`flex items-start gap-4 p-4 bg-white dark:bg-[#131b2e] rounded-lg border transition-shadow cursor-pointer ${
                  item.isRead
                    ? "border-gray-200 dark:border-slate-800 opacity-80"
                    : "border-blue-300 dark:border-blue-900 shadow-sm"
                }`}
              >
                <div className="p-2.5 rounded-full bg-gray-100 dark:bg-slate-800 shrink-0">
                  {getNotificationIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm">
                      {title}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                    {content}
                  </p>
                  {item.actionUrl && (
                    <a
                      href={item.actionUrl}
                      className="inline-block text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline mt-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {actionText || "View details →"}
                    </a>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                  {!item.isRead && (
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
