import { clsx, type ClassValue } from "clsx";
import { env } from "@/lib/config";

import {
  LayoutDashboard,
  Map,
  MapPin,
  Tag,
  BadgePercent,
  Users,
  Bell,
  Building2,
  BarChart3,
  Settings,
  LogOut,
  CreditCard,
  Trophy,
  Ticket,
} from "lucide-react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function translatePlaceName(str: string, lang: string = "es"): string {
  if (!str || typeof str !== "string") return str || "";
  if (lang !== "en") return str;

  let result = str;

  result = result
    .replace(/Desafío59 La sala de escape/gi, "Challenge 59 Escape Room")
    .replace(/La sala de escape/gi, "Escape Room")
    .replace(/Fórmula divertida/gi, "Formula Fun")
    .replace(/Fórmula Diversión/gi, "Formula Fun")
    .replace(/Sal si puedes aventuras/gi, "Sal Si Puedes Adventures")
    .replace(/Arena vikinga/gi, "Viking Arena")
    .replace(/Parque de aventuras/gi, "Adventure Park")
    .replace(/Parque Pasivo/gi, "Passive Park")
    .replace(/Parque Recreativo/gi, "Recreational Park")
    .replace(/Parque Nacional/gi, "National Park")
    .replace(/Parque Central/gi, "Central Park")
    .replace(/Parque Infantil/gi, "Children's Park")
    .replace(/Parque Urban/gi, "Urban Park")
    .replace(/Parque/gi, "Park")
    .replace(/Jardín Botánico|Jardin Botanico/gi, "Botanical Garden")
    .replace(/Reserva Natural/gi, "Nature Reserve")
    .replace(/Centro de Visitantes/gi, "Visitor Center")
    .replace(/Bosque Nacional/gi, "National Forest")
    .replace(/Bosque Estatal/gi, "State Forest")
    .replace(/Bosque/gi, "Forest")
    .replace(/Playa de/gi, "Beach of")
    .replace(/Playa/gi, "Beach")
    .replace(/Isla de/gi, "Island of")
    .replace(/Isla/gi, "Island")
    .replace(/Cueva de/gi, "Cave of")
    .replace(/Cueva/gi, "Cave")
    .replace(/Faro de/gi, "Lighthouse of")
    .replace(/Faro/gi, "Lighthouse")
    .replace(/Castillo de/gi, "Castle of")
    .replace(/Castillo/gi, "Castle")
    .replace(/Fuerte de/gi, "Fort of")
    .replace(/Fuerte/gi, "Fort")
    .replace(/Cascada/gi, "Waterfall")
    .replace(/Mirador/gi, "Viewpoint")
    .replace(/Paseo/gi, "Promenade")
    .replace(/Muelle/gi, "Pier")
    .replace(/Laguna/gi, "Lagoon")
    .replace(/Bahía|Bahia/gi, "Bay");

  return result;
}

/**
 * Safely extracts a localized string from an i18n object { en?: string, es?: string } or string.
 * Supports fallback to current active language or alternate language.
 */
export function getLocalized(val: any, lang: string = "es"): string {
  if (val == null) return "";
  let extracted = "";
  if (typeof val === "string") {
    extracted = val;
  } else if (typeof val === "object") {
    extracted = val[lang] || val.es || val.en || Object.values(val)[0] || "";
  } else {
    extracted = String(val);
  }
  return translatePlaceName(extracted, lang);
}

export function formatLocalizedDifficulty(val: any, lang: string = "es"): string {
  if (!val) return "";
  const str = getLocalized(val, lang);
  if (!str) return "";
  const lower = str.toLowerCase().trim();
  if (lower.includes("facil") || lower.includes("easy")) {
    return lang === "es" ? "Fácil" : "Easy";
  }
  if (lower.includes("med") || lower.includes("mod") || lower.includes("interm")) {
    return lang === "es" ? "Media" : "Medium";
  }
  if (lower.includes("dificil") || lower.includes("hard") || lower.includes("alta")) {
    return lang === "es" ? "Difícil" : "Hard";
  }
  return str;
}

export function formatLocalizedSchedule(val: any, lang: string = "es"): string {
  if (!val) return "";
  const str = getLocalized(val, lang);
  if (!str) return "";
  
  let result = str;
  if (lang === "en") {
    result = str
      .replace(/lunes a viernes/gi, "Mon to Fri")
      .replace(/lunes a domingo/gi, "Mon to Sun")
      .replace(/lun - dom/gi, "Mon - Sun")
      .replace(/lun - vie/gi, "Mon - Fri")
      .replace(/lunes/gi, "Mon")
      .replace(/martes/gi, "Tue")
      .replace(/miércoles|miercoles/gi, "Wed")
      .replace(/jueves/gi, "Thu")
      .replace(/viernes/gi, "Fri")
      .replace(/sábado|sabado/gi, "Sat")
      .replace(/domingo/gi, "Sun")
      .replace(/abierto las 24 horas|24 horas/gi, "Open 24 Hours")
      .replace(/cerrado/gi, "Closed");
  } else {
    result = str
      .replace(/monday to friday/gi, "Lun a Vie")
      .replace(/monday to sunday/gi, "Lun a Dom")
      .replace(/mon - sun/gi, "Lun - Dom")
      .replace(/mon - fri/gi, "Lun - Vie")
      .replace(/monday/gi, "Lunes")
      .replace(/tuesday/gi, "Martes")
      .replace(/wednesday/gi, "Miércoles")
      .replace(/thursday/gi, "Jueves")
      .replace(/friday/gi, "Viernes")
      .replace(/saturday/gi, "Sábado")
      .replace(/sunday/gi, "Domingo")
      .replace(/open 24 hours/gi, "Abierto 24 Horas")
      .replace(/closed/gi, "Cerrado");
  }
  return convertTo12Hour(result);
}

const FALLBACK_IMAGE = "/exploring-today.jpg";

const extractMediaPath = (item: any): string => {
  if (!item) return "";
  if (typeof item === "string") return item.trim();
  if (typeof item === "object") {
    return String(item.url || item.path || item.src || item.secure_url || "").trim();
  }
  return "";
};

export const isUnusableMediaPath = (path?: string) => {
  if (!path || typeof path !== "string") return true;
  const value = path.trim();
  return !value || value === "undefined" || value === "null";
};

export const removeAccents = (str?: string): string => {
  if (!str || typeof str !== "string") return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export const isVideoUrl = (url?: string) => {
  if (!url || typeof url !== "string") return false;
  const path = url.split("?")[0].split("#")[0].toLowerCase();
  if (/\.(jpe?g|png|gif|webp|bmp|heic|svg|pdf)$/i.test(path)) return false;
  return /\.(mp4|webm|ogv|mov|mkv|3gp|3gpp|avi|wmv|flv|m4v|mpeg|mpg)$/i.test(
    path,
  );
};

export const getUsableMediaList = (media?: any): string[] => {
  const items = Array.isArray(media) ? media : media ? [media] : [];
  return items.map(extractMediaPath).filter((path) => !isUnusableMediaPath(path));
};

export const getUsableMediaUrl = (media?: any) => {
  const usable = getUsableMediaList(media);
  return usable.length > 0 ? getImageUrl(usable[0]) : "";
};

function isLocalHostname(hostname: string) {
  // Dev machines change LAN IP, so match the whole private range
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

function getFileOrigin() {
  // Use window.location.host which includes port (e.g. "10.10.26.208:3000")
  const pageHost = typeof window !== "undefined" ? window.location.host : "";
  const candidates = [
    env.NEXT_PUBLIC_IMAGE_BASEURL,
    env.NEXT_PUBLIC_BASEURL,
  ];

  for (const raw of candidates) {
    const value = (raw || "").trim();
    if (!value) continue;
    try {
      const url = new URL(value);
      const path = url.pathname.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
      const base = `${url.origin}${path}`;

      // Don't use a leftover LAN IP when the site is on a public host
      const pageHostname = pageHost.split(":")[0];
      if (pageHost && !isLocalHostname(pageHostname) && isLocalHostname(url.hostname)) {
        continue;
      }

      // Same host:port with no path = Next.js dev server, which does not serve /uploads
      // Use url.host (includes port) so backend on :5004 is NOT skipped when page is on :3000
      if (pageHost && url.host === pageHost && !path) {
        continue;
      }

      return base;
    } catch {
      continue;
    }
  }

  return "";
}

export const getImageUrl = (media?: any) => {
  if (!media) return FALLBACK_IMAGE;

  let mediaPath = "";

  if (Array.isArray(media) && media.length > 0) {
    mediaPath = getUsableMediaList(media)[0] || extractMediaPath(media[0]);
  } else {
    mediaPath = extractMediaPath(media);
  }

  if (isUnusableMediaPath(mediaPath)) {
    return FALLBACK_IMAGE;
  }

  if (mediaPath.startsWith("blob:") || mediaPath.startsWith("data:")) {
    return mediaPath;
  }

  const fileOrigin = getFileOrigin();

  // Full URL: rewrite leftover localhost/dev hosts onto the active API
  if (mediaPath.startsWith("http://") || mediaPath.startsWith("https://")) {
    try {
      const parsed = new URL(mediaPath);
      if (fileOrigin && isLocalHostname(parsed.hostname)) {
        return `${fileOrigin}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      // keep original
    }
    return mediaPath;
  }

  const path = mediaPath.startsWith("/") ? mediaPath : `/${mediaPath}`;
  if (!fileOrigin) return path;
  return `${fileOrigin}${path}`;
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);

  return date.toLocaleDateString("en-GB");
};

// Decode a JWT payload (client-side only, no verification)
export function decodeJwtPayload(token: string) {
  try {
    let base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    if (pad) base64 += "=".repeat(4 - pad);
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

// Extract human-readable error messages from RTK Query error responses
export function getApiErrorMessage(error: unknown): string {
  if (!error) return "An unexpected error occurred.";

  if (typeof error === "object") {
    // Check for RTK query FetchBaseQueryError
    if ("status" in error) {
      const fetchError = error as any;
      if (fetchError.data && typeof fetchError.data === "object") {
        if ("message" in fetchError.data) {
          return String(fetchError.data.message);
        }
        if ("error" in fetchError.data) {
          return String(fetchError.data.error);
        }
      }
      if (fetchError.error) {
        return String(fetchError.error);
      }
      return `Error: ${fetchError.status}`;
    }

    // Check for SerializedError
    if ("message" in error) {
      const serializedError = error as any;
      return String(serializedError.message);
    }
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unexpected error occurred.";
}


export const mapStyles = [
  {
    featureType: "all",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.business",
    stylers: [{ visibility: "on" }],
  },
];

export const adminMenuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Maps",
    url: "/dashboard/maps",
    icon: Map,
  },
  {
    title: "Places",
    url: "/dashboard/places",
    icon: MapPin,
  },
  {
    title: "Categories",
    url: "/dashboard/categories",
    icon: Tag,
  },
  {
    title: "Offers",
    url: "/dashboard/offers",
    icon: BadgePercent,
  },
  {
    title: "Users & Roles",
    url: "/dashboard/users-roles",
    icon: Users,
  },
  {
    title: "Notifications",
    url: "/dashboard/notification",
    icon: Bell,
  },
  {
    title: "Business",
    url: "/dashboard/business",
    icon: Building2,
  },
  {
    title: "Rewards",
    url: "/dashboard/rewards",
    icon: Trophy,
  },
  {
    title: "Reviews Verification",
    url: "/dashboard/reviews-verification",
    icon: Bell,
  },
  {
    title: "Reports & Statistics",
    url: "/dashboard/reports",
    icon: BarChart3,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
  {
    title: "Subscription",
    url: "/dashboard/subscription",
    icon: CreditCard,
  },
  {
    title: "Promo Links",
    url: "/dashboard/promos",
    icon: Ticket,
  },
];

export const mapEditorMenuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Maps",
    url: "/dashboard/maps",
    icon: Map,
  },
  {
    title: "Places",
    url: "/dashboard/places",
    icon: MapPin,
  },
  {
    title: "Offers",
    url: "/dashboard/offers",
    icon: BadgePercent,
  },
];

/**
 * Formats entry cost for user & admin display.
 * e.g. "10" -> "$10 / person" (en) / "$10 / persona" (es)
 *      "15 / vehicle" -> "$15 / vehicle"
 *      "Free" -> "Free" (en) / "Gratis" (es) (no $ sign)
 *      "Gratis" -> "Gratis" (no $ sign)
 */
export function formatEntryCost(raw?: unknown, lang: string = "es"): string {
  if (raw == null) return "";
  const localized = (raw && typeof raw === "object") ? getLocalized(raw, lang) : String(raw);
  const str = String(localized || "").trim();
  if (!str) return "";

  // Strip leading dollar sign and whitespace for clean checking
  const clean = str.replace(/^\$\s*/, "").trim();
  const lower = clean.toLowerCase();

  // If it indicates free / gratis / 0, return without the money sign ($)
  if (
    lower === "free" ||
    lower === "gratis" ||
    lower === "0" ||
    lower === "free entrance" ||
    lower === "entrada gratis" ||
    lower === "free entry" ||
    lower === "gratis / free" ||
    lower === "free / gratis"
  ) {
    return lang === "es" ? "Gratis" : "Free";
  }

  // If the text contains "free" or "gratis" anywhere, return clean without '$'
  if (lower.includes("free") || lower.includes("gratis")) {
    return clean;
  }

  // If it already specifies unit (/ person, / vehicle, etc.)
  if (
    str.includes("/") ||
    lower.includes("person") ||
    lower.includes("vehicle") ||
    lower.includes("group") ||
    lower.includes("persona") ||
    lower.includes("vehiculo") ||
    lower.includes("vehículo")
  ) {
    return str.startsWith("$") ? str : `$${clean}`;
  }

  // Pure number e.g. "10" -> "$10 / person" or "$10 / persona"
  const numMatch = clean.replace(/^\$/, "").trim();
  if (!Number.isNaN(Number(numMatch)) && numMatch !== "") {
    return lang === "es" ? `$${numMatch} / persona` : `$${numMatch} / person`;
  }

  return str.startsWith("$") ? str : `$${clean}`;
}

/**
 * Formats walking time for user & admin display.
 * e.g. "45" -> "45 mins"
 *      "30 minutes" -> "30 mins"
 *      "1.5 hours" -> "1.5 hours"
 */
export function formatHikeTime(raw?: unknown): string {
  if (raw == null) return "";
  const str = String(raw).trim();
  if (!str) return "";

  const lower = str.toLowerCase();
  if (lower.includes("min") || lower.includes("hour") || lower.includes("hr")) {
    return str;
  }

  const num = Number(str);
  if (!Number.isNaN(num)) {
    if (num <= 5 && str.includes(".")) {
      return `${num} hours`;
    }
    return `${num} mins`;
  }

  return str;
}

export function parseEntryCost(val?: unknown): { amount: string; type: string } {
  if (val == null) return { amount: "", type: "/ person" };
  const str = String(val).trim();
  if (!str) return { amount: "", type: "/ person" };

  const clean = str.replace(/^\$\s*/, "").trim();
  const lower = clean.toLowerCase();
  if (
    lower === "free" ||
    lower === "gratis" ||
    lower === "0" ||
    lower === "free entrance" ||
    lower === "entrada gratis" ||
    lower === "free entry"
  ) {
    return { amount: "", type: "Free" };
  }

  let type = "/ person";
  if (lower.includes("vehicle") || lower.includes("car") || lower.includes("vehiculo") || lower.includes("vehículo")) type = "/ vehicle";
  else if (lower.includes("group") || lower.includes("grupo")) type = "/ group";
  else if (lower.includes("flat") || lower.includes("total")) type = "flat";
  else if (lower.includes("person") || lower.includes("persona")) type = "/ person";

  const match = str.match(/\d+(?:\.\d+)?/);
  const amount = match ? match[0] : "";
  return { amount, type };
}

export function composeEntryCost(amount: string, type: string): string {
  if (type === "Free") return "Free";
  const trimmed = amount.trim().replace(/^\$/, "");
  if (!trimmed) return "";
  if (type === "flat") return `$${trimmed}`;
  return `$${trimmed} ${type}`;
}

export function parseHikeTime(val?: unknown): { value: string; unit: "mins" | "hours" } {
  if (val == null) return { value: "", unit: "mins" };
  const str = String(val).trim();
  if (!str) return { value: "", unit: "mins" };

  const lower = str.toLowerCase();
  let unit: "mins" | "hours" = "mins";
  if (lower.includes("hour") || lower.includes("hr")) {
    unit = "hours";
  }

  const match = str.match(/\d+(?:\.\d+)?/);
  const value = match ? match[0] : "";
  return { value, unit };
}

export function composeHikeTime(value: string, unit: "mins" | "hours"): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const num = Number(trimmed);
  if (!Number.isNaN(num)) {
    if (unit === "hours") {
      return num === 1 ? "1 hour" : `${trimmed} hours`;
    }
    return num === 1 ? "1 min" : `${trimmed} mins`;
  }
  return `${trimmed} ${unit}`;
}

/**
 * Converts military time (24-hour, e.g. "14:00", "09:00:00", "09:00 - 18:00") into 12-hour AM/PM format (e.g. "2:00 PM", "9:00 AM - 6:00 PM").
 */
export function convertTo12Hour(timeStr?: string | null): string {
  if (!timeStr || typeof timeStr !== "string") return "";

  let result = timeStr.trim();

  // If already contains AM or PM, return as is
  if (/\b(am|pm)\b/i.test(result)) return result;

  // Handle standalone single hour number like "9", "14", "18"
  if (/^([0-1]?[0-9]|2[0-3])$/.test(result)) {
    let h = parseInt(result, 10);
    const period = h >= 12 ? "PM" : "AM";
    if (h === 0) h = 12;
    else if (h > 12) h = h % 12;
    return `${h}:00 ${period}`;
  }

  // 1. Replace HH:MM:SS or HH:MM patterns (with optional existing AM/PM)
  result = result.replace(
    /\b([0-1]?[0-9]|2[0-3]):([0-5][0-9])(?::[0-5][0-9])?(?:\s*(am|pm|AM|PM))?\b/gi,
    (match, hourStr, minStr, ampm) => {
      let h = parseInt(hourStr, 10);
      const period = ampm ? ampm.toUpperCase() : h >= 12 ? "PM" : "AM";
      if (h === 0) h = 12;
      else if (h > 12) h = h % 12;
      return `${h}:${minStr} ${period}`;
    }
  );

  // 2. Handle standalone military hours without minutes in range pattern like "9 - 18" or "09 - 18"
  result = result.replace(
    /\b([0-1]?[0-9]|2[0-3])\s*[-–—]\s*([0-1]?[0-9]|2[0-3])\b/gi,
    (match, startHStr, endHStr) => {
      if (match.includes("AM") || match.includes("PM")) return match;
      let sh = parseInt(startHStr, 10);
      let eh = parseInt(endHStr, 10);
      if (sh >= 0 && sh <= 24 && eh >= 0 && eh <= 24) {
        const sPeriod = sh >= 12 ? "PM" : "AM";
        sh = sh % 12 || 12;
        const ePeriod = eh >= 12 ? "PM" : "AM";
        eh = eh % 12 || 12;
        return `${sh}:00 ${sPeriod} – ${eh}:00 ${ePeriod}`;
      }
      return match;
    }
  );

  return result;
}

/**
 * Triggers downloading a file with a custom filename using the browser's native download manager.
 * Avoids buffering large files into JavaScript heap memory via fetch+blob,
 * allowing real-time browser download progress and faster streaming.
 */
export async function downloadFileWithCustomName(
  url: string,
  desiredFilename: string
): Promise<void> {
  if (!url || typeof window === "undefined") return;

  let filename = desiredFilename ? desiredFilename.trim() : "Itinerary.pdf";
  // Clean illegal characters for OS filenames
  filename = filename.replace(/[<>:"/\\|?*]/g, "_").trim();
  if (!/\.[a-zA-Z0-9]+$/i.test(filename)) {
    filename += ".pdf";
  }

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    try {
      document.body.removeChild(link);
    } catch {
      // ignore
    }
  }, 200);
}

/**
 * Strips HTML tags (especially <img>, <br>, <b>, etc. from Google My Maps / KML imports),
 * decodes entities, and normalizes spacing so descriptions render cleanly.
 */
export function cleanDescriptionHtml(raw: unknown): string {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .replace(/<img[^>]*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extracts any image URLs from raw HTML <img> tags (useful for KML imported placemarks
 * where photos were placed inside the description CDATA).
 */
export function extractImagesFromHtml(raw: unknown): string[] {
  if (!raw) return [];
  const str = typeof raw === "string" ? raw : typeof raw === "object" ? Object.values(raw).join(" ") : "";
  if (!str) return [];
  const images: string[] = [];
  const imgRegex = /src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(str)) !== null) {
    if (match[1] && !images.includes(match[1])) {
      images.push(match[1]);
    }
  }
  return images;
}




