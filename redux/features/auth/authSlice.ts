import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../../store";
import { baseApi } from "../../api/baseApi";

export const roles = {
  ADMIN: "admin" as const,
  SUPER_ADMIN: "superadmin" as const,
  USER: "business" as const,
};

export type Role = (typeof roles)[keyof typeof roles];

export type TUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  image: string;
};

type AuthState = {
  user: TUser | null;
  accessToken: string | null;
};

// ── Cookie helpers (client-side only) ──────────────────────────────
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop()!.split(";").shift() || "");
  }
  return null;
}

import { decodeJwtPayload } from "@/lib/utils";

const getInitialAuth = (): AuthState => {
  if (typeof document === "undefined") {
    return { user: null, accessToken: null };
  }
  const token = getCookie("accessToken");
  if (!token) return { user: null, accessToken: null };

  try {
    const decoded = decodeJwtPayload(token);
    if (!decoded) return { user: null, accessToken: null };
    return {
      accessToken: token,
      user: {
        id: decoded.authId ?? "",
        name: decoded.name ?? "",
        email: decoded.email ?? "",
        role: decoded.role ?? "user",
        image: "",
      },
    };
  } catch (error) {
    return { user: null, accessToken: null };
  }
};

const initialState: AuthState = getInitialAuth();

function setCookie(name: string, value: string, days = 10) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function removeCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

function clearAuthCookies() {
  removeCookie("accessToken");
  removeCookie("userRole");
  removeCookie("loggedIn");
}

/** Keep middleware cookies in sync with Redux (persist rehydrate does not call setUser). */
export function syncAuthCookies(
  accessToken: string | null,
  role?: string | null,
) {
  if (!accessToken) {
    clearAuthCookies();
    return;
  }
  // JWT may be too large for a cookie; loggedIn is the middleware fallback.
  setCookie("accessToken", accessToken);
  setCookie("loggedIn", "1");
  if (role) setCookie("userRole", String(role));
}

export function navigateAfterAuth(path: string) {
  let next = "/maps";
  try {
    const target = new URL(path, window.location.origin);
    if (path.startsWith("/") && !path.startsWith("//") && target.origin === window.location.origin) {
      next = `${target.pathname}${target.search}${target.hash}`;
    }
  } catch { /* invalid return paths use the default destination */ }
  window.location.assign(next);
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (
      state,
      action: PayloadAction<{
        user: TUser;
        accessToken: string;
      }>,
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      syncAuthCookies(action.payload.accessToken, action.payload.user.role);
    },
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
      const decoded = decodeJwtPayload(action.payload);
      if (state.user && decoded?.role) state.user.role = decoded.role;
      syncAuthCookies(action.payload, decoded?.role || state.user?.role);
    },
    updateUserRole: (state, action: PayloadAction<string>) => {
      if (state.user) {
        state.user.role = action.payload as any;
      }
      if (state.accessToken) {
        syncAuthCookies(state.accessToken, action.payload);
      }
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      clearAuthCookies();
    },
  },
});

export const { setUser, setAccessToken, updateUserRole, logout } = authSlice.actions;
export default authSlice.reducer;

export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectAccessToken = (state: RootState) => state.auth.accessToken;
