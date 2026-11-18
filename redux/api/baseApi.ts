import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  BaseQueryApi,
} from "@reduxjs/toolkit/query/react";
import { RootState } from "../store";
import { logout, setAccessToken } from "../features/auth/authSlice";

import { env } from "@/lib/config";

const baseURL = env.NEXT_PUBLIC_BASEURL;

const baseQuery = fetchBaseQuery({
  baseUrl: `${baseURL}/api/v1`,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = state.auth.accessToken;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("app_language") || "es";
      headers.set("Accept-Language", savedLang);
    } else {
      headers.set("Accept-Language", "es");
    }

    return headers;
  },
});

type RefreshOutcome = { accessToken?: string; error?: FetchBaseQueryError };
type RefreshTask = { token: string | null; account: string | null; promise: Promise<RefreshOutcome> };
// A request burst should refresh once per Redux store, never across users/SSR stores.
const refreshTasks = new WeakMap<BaseQueryApi["dispatch"], RefreshTask>();
const recentRenewals = new WeakMap<BaseQueryApi["dispatch"], {
  accessToken: string; account: string | null; user: RootState["auth"]["user"];
}>();

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const auth = () => (api.getState() as RootState).auth;
  const account = () => auth().user?.id || auth().user?.email || null;
  const requestToken = auth().accessToken;
  const requestAccount = account();
  let result = await baseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    // Do not replay a previous account's request after logout/account switching.
    if (account() !== requestAccount) return result;
    if (auth().accessToken !== requestToken) {
      const renewal = recentRenewals.get(api.dispatch);
      // Only an automatic renewal may replay this request. A fresh same-account
      // login is a new session, whose old mutations must not be replayed.
      return renewal && renewal.accessToken === auth().accessToken &&
        renewal.account === requestAccount && renewal.user === auth().user
        ? baseQuery(args, api, extraOptions) : result;
    }
    let task = refreshTasks.get(api.dispatch);
    if (!task || task.token !== requestToken || task.account !== requestAccount) {
      const promise = (async (): Promise<RefreshOutcome> => {
        const refreshResult = await baseQuery({ url: "/auth/refresh-token", method: "POST" }, api, extraOptions);
        if (account() !== requestAccount || auth().accessToken !== requestToken) return {};
        const data = refreshResult.data as { success?: boolean; data?: { accessToken?: string } } | undefined;
        if (data?.success && typeof data.data?.accessToken === "string" && data.data.accessToken) {
          api.dispatch(setAccessToken(data.data.accessToken));
          recentRenewals.set(api.dispatch, { accessToken: data.data.accessToken, account: requestAccount, user: auth().user });
          return { accessToken: data.data.accessToken };
        }
        // An overloaded/offline refresh endpoint must not sign out a valid user.
        if (refreshResult.error?.status === 401 || refreshResult.error?.status === 403 || data?.success === false) {
          api.dispatch(logout());
        }
        return { error: refreshResult.error || { status: "CUSTOM_ERROR", error: "Could not refresh the session. Please try again." } };
      })().catch((): RefreshOutcome => ({ error: { status: "FETCH_ERROR", error: "Could not refresh the session. Please try again." } }));
      task = { token: requestToken, account: requestAccount, promise };
      refreshTasks.set(api.dispatch, task);
      const createdTask = task;
      void promise.then(() => {
        if (refreshTasks.get(api.dispatch) === createdTask) refreshTasks.delete(api.dispatch);
      });
    }
    const outcome = await task.promise;
    if (account() !== requestAccount) return result;
    if (outcome.accessToken && auth().accessToken === outcome.accessToken) {
      result = await baseQuery(args, api, extraOptions);
    } else if (outcome.error) {
      return { error: outcome.error };
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Auth",
    "User",
    "Map",
    "Category",
    "Place",
    "Offer",
    "Business",
    "Stats",
    "Review",
    "Subscription",
    "Favourite",
    "Visited",
    "Award",
    "Promo",
    "Notification",
    "RoutePlan",
  ],
  endpoints: () => ({}),
});
