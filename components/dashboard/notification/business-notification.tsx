"use client";

import {
  Gift,
  AlertCircle,
  MapPin,
  Map,
  Briefcase,
  Loader2,
} from "lucide-react";
import { BusinessNotificationCard } from "./business-notification-card";
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

export default function BusinessNotification() {
  const { t, language } = useLanguage();
  const { data: response, isLoading } = useGetMyNotificationsQuery({
    category: "roadtripeado",
    limit: 20,
  });
  const [markAsRead] = useMarkAsReadMutation();

  const rawNotifs = response as any;
  const notifications: INotificationItem[] = Array.isArray(rawNotifs)
    ? rawNotifs
    : (Array.isArray(rawNotifs?.data) ? rawNotifs.data : []);

  const getText = (val: any) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    return val[language] || val.es || val.en || "";
  };

  const getIconConfig = (type: string) => {
    switch (type) {
      case "NEW_OFFER":
        return { icon: Gift, bgColor: "bg-purple-500" };
      case "NEW_LOCATION":
        return { icon: MapPin, bgColor: "bg-emerald-500" };
      case "NEW_MAP":
        return { icon: Map, bgColor: "bg-blue-500" };
      case "IMPORTANT_UPDATE":
      case "SYSTEM_ALERT":
      default:
        return { icon: AlertCircle, bgColor: "bg-[#fabf13]" };
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Briefcase size={24} className="text-[#3B82F6]" />
        <h2 className="text-xl font-bold text-black dark:text-slate-100 font-inter">
          {t("notifications_page.business_notifications")}
        </h2>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-6 bg-white dark:bg-[#131b2e] rounded-lg border border-gray-200 dark:border-slate-800">
          <Loader2 className="animate-spin text-gray-400" size={20} />
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-6 text-center bg-white dark:bg-[#131b2e] rounded-lg border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400">
          <p className="text-sm">No Roadtripeado updates at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((item) => {
            const { icon: Icon, bgColor } = getIconConfig(item.type);
            const title = getText(item.title);
            const description = getText(item.content);

            return (
              <div
                key={item._id}
                onClick={() => !item.isRead && markAsRead(item._id)}
                className={`rounded-lg transition-opacity cursor-pointer ${
                  item.isRead ? "opacity-75" : "ring-1 ring-blue-400/30"
                }`}
              >
                <BusinessNotificationCard
                  icon={<Icon size={20} className="text-white" />}
                  title={title}
                  description={description}
                  timestamp={formatRelativeTime(item.createdAt)}
                  iconBgColor={bgColor}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
