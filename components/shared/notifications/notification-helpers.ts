import { canRevealPlace } from "@/lib/place-access";
import type { INotificationItem } from "@/redux/features/notification/notificationApi";
import {
  Bell,
  Star,
  Trophy,
  Award,
  Gift,
  MapPin,
  Map,
  AlertCircle,
  MessageSquare,
  Compass,
} from "lucide-react";

export function getVisibleNotification(
  notification: INotificationItem,
  user: any,
): INotificationItem {
  if (notification.type !== "NEW_LOCATION") return notification;
  const metadata = notification.metadata || {};
  // The backend resolves free-map and purchase access before returning this flag.
  if (metadata.canRevealPlace === true) return notification;
  const place = metadata.place || metadata.location || {};
  if (canRevealPlace({
    ...place,
    map: place.map || metadata.map || metadata.mapId,
    isLocked: place.isLocked || metadata.isLocked,
  }, user)) return notification;
  return {
    ...notification,
    title: { en: "New place added", es: "Nuevo lugar añadido" },
    content: {
      en: "A new place has been added to explore.",
      es: "Se ha añadido un nuevo lugar para explorar.",
    },
    actionText: { en: "View maps", es: "Ver mapas" },
    actionUrl: "/maps",
  };
}

/**
 * Format relative time in Spanish or English
 */
export function formatRelativeTime(dateString: string, lang: string = "es"): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  const isEs = lang === "es";

  if (diffSec < 60) return isEs ? "Ahora mismo" : "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return isEs ? `Hace ${diffMin}m` : `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return isEs ? `Hace ${diffHours}h` : `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return isEs ? `Hace ${diffDays}d` : `${diffDays}d ago`;
}

/**
 * Safely extract multilingual notification text
 */
export function getNotificationText(val: any, language: string = "es"): string {
  if (!val) return "";
  let str = "";
  if (typeof val === "string") {
    str = val;
  } else if (typeof val === "object") {
    str = val[language] || val.es || val.en || "";
    if (typeof str === "object") {
      str = (str as any)[language] || (str as any).es || (str as any).en || "";
    }
  }
  if (typeof str === "string") {
    return str.replace(/\[object Object\]/gi, language === "es" ? "tu aporte" : "your submission");
  }
  return String(str || "");
}

export interface NotificationIconConfig {
  icon: any;
  bgColor: string;
  badgeColor?: string;
  label?: string;
}

/**
 * Icon and badge color configuration mapped by notification type and category
 */
export function getNotificationIconConfig(
  type: string,
  category: string,
  t?: (key: string) => string
): NotificationIconConfig {
  const translate = t || ((k: string) => "");

  switch (type) {
    case "NEW_OFFER":
      return {
        icon: Gift,
        bgColor: "bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 border-purple-200/60 dark:border-purple-800/40",
        badgeColor: "bg-purple-50/90 text-purple-700 border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40",
        label: translate("notifications_page.offer") || "Offer",
      };
    case "NEW_LOCATION":
      return {
        icon: MapPin,
        bgColor: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40",
        badgeColor: "bg-emerald-50/90 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
        label: translate("notifications_page.location") || "Location",
      };
    case "NEW_MAP":
      return {
        icon: Map,
        bgColor: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/40",
        badgeColor: "bg-blue-50/90 text-blue-700 border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40",
        label: translate("notifications_page.map") || "Map",
      };
    case "APPROVED_REVIEW":
      return {
        icon: Star,
        bgColor: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40",
        badgeColor: "bg-amber-50/90 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40",
        label: translate("notifications_page.review") || "Review",
      };
    case "UNLOCKED_LEVEL":
      return {
        icon: Trophy,
        bgColor: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400 border-yellow-200/60 dark:border-yellow-800/40",
        badgeColor: "bg-yellow-50/90 text-yellow-800 border-yellow-200/60 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800/40",
        label: translate("notifications_page.level_up") || "Level Up",
      };
    case "EARNED_REWARD":
      return {
        icon: Award,
        bgColor: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/40",
        badgeColor: "bg-rose-50/90 text-rose-700 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40",
        label: translate("notifications_page.reward") || "Reward",
      };
    case "IMPORTANT_UPDATE":
    case "SYSTEM_ALERT":
      return {
        icon: AlertCircle,
        bgColor: "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 border-red-200/60 dark:border-red-900/40",
        badgeColor: "bg-red-50/90 text-red-700 border-red-200/60 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/40",
        label: translate("notifications_page.alert") || "Alert",
      };
    case "NEW_MESSAGE":
      return {
        icon: MessageSquare,
        bgColor: "bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400 border-sky-200/60 dark:border-sky-800/40",
        badgeColor: "bg-sky-50/90 text-sky-700 border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40",
        label: translate("notifications_page.message") || "Message",
      };
    default:
      return category === "roadtripeado"
        ? {
            icon: Compass,
            bgColor: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/40",
            badgeColor: "bg-blue-50/90 text-blue-700 border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40",
            label: "Roadtripeado",
          }
        : {
            icon: Bell,
            bgColor: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/40",
            badgeColor: "bg-indigo-50/90 text-indigo-700 border-indigo-200/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/40",
            label: translate("notifications_page.account") || "Account",
          };
  }
}
