"use client";

import { emitWhenReady } from "@/lib/socket";
import store from "@/redux/store";

const recentVisits = new Map<string, number>();

export type UsageType = "map" | "place" | "business";

export function normalizeEntityType(type?: string | null): UsageType {
  const value = String(type || "").trim().toLowerCase();
  if (value === "business") return "business";
  if (value === "map") return "map";
  return "place";
}

export function normalizePinType(typeOrObj?: any): "place" | "business" {
  if (!typeOrObj) return "place";
  if (typeof typeOrObj === "object") {
    const raw = typeOrObj.type || typeOrObj.placeType || "";
    return String(raw).trim().toLowerCase() === "business" ? "business" : "place";
  }
  return String(typeOrObj).trim().toLowerCase() === "business"
    ? "business"
    : "place";
}

/** Skip React Strict Mode double-mount and accidental double emits. */
export function shouldRecordVisit(key: string, windowMs = 2500) {
  if (!key) return false;
  const now = Date.now();
  const prev = recentVisits.get(key) || 0;
  if (now - prev < windowMs) return false;
  recentVisits.set(key, now);
  return true;
}

const VISITOR_KEY = "roadtripeado.visitorId";

export function getVisitorId() {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const created =
      window.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(VISITOR_KEY, created);
    return created;
  } catch {
    return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

function getAccessToken() {
  const token = store.getState().auth.accessToken;
  if (token) return token;
  if (typeof document === "undefined") return "";
  const raw = document.cookie
    .split("; ")
    .find((row) => row.startsWith("accessToken="))
    ?.split("=")
    .slice(1)
    .join("=");
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

const SESSION_TRACK_KEY = "roadtripeado.usage.session";

function alreadyTrackedThisTab(type: UsageType, id: string) {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.sessionStorage.getItem(SESSION_TRACK_KEY);
    const seen = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    const token = getAccessToken();
    const userScope = token ? token.slice(-12) : getVisitorId();
    const key = `${userScope}:${type}:${id}`;
    if (seen[key]) return true;
    seen[key] = Date.now();
    window.sessionStorage.setItem(SESSION_TRACK_KEY, JSON.stringify(seen));
    return false;
  } catch {
    return false;
  }
}

export function trackUsage(type: UsageType | string, id?: string) {
  const entityType = normalizeEntityType(type);
  const entityId = typeof id === "string" ? id.trim() : "";
  if (!entityId) return;
  if (alreadyTrackedThisTab(entityType, entityId)) return;
  const userScope = store.getState().auth.user?.id || getAccessToken() || getVisitorId();
  if (!shouldRecordVisit(`${userScope}:${entityType}:${entityId}`)) return;

  emitWhenReady("track-usage", {
    type: entityType,
    id: entityId,
    visitorId: getVisitorId(),
    token: getAccessToken() || "",
  });

  // For businesses, also ensure the REST view/visit increment is called for guaranteed database persistence
  if (entityType === "business" && typeof window !== "undefined") {
    try {
      const rawBase = (process.env.NEXT_PUBLIC_BASEURL || "").replace(/\/$/, "");
      if (rawBase) {
        const apiBase = rawBase.endsWith("/api/v1") ? rawBase : `${rawBase}/api/v1`;
        const token = getAccessToken();
        fetch(`${apiBase}/business/${entityId}/view`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "omit",
        }).catch(() => {
          // Non-blocking background call
        });
      }
    } catch {
      // Non-blocking
    }
  }
}
