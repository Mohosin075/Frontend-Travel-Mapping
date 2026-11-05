"use client";
import { useEffect, useLayoutEffect } from "react";
import { Provider } from "react-redux";
import { usePathname } from "next/navigation";
import { PersistGate } from "redux-persist/integration/react";
import store, { persistor } from "@/redux/store";
import { Toaster } from "sonner";
import { CrossTabLogoutListener } from "@/components/shared/cross-tab-logout-listener";
import { useAppDispatch, useAppSelector } from "@/redux/hook";
import {
  selectAccessToken,
  selectCurrentUser,
  syncAuthCookies,
  updateUserRole,
} from "@/redux/features/auth/authSlice";
import { useGetProfileQuery } from "@/redux/features/user/userApi";

function AuthCookieSync() {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector(selectAccessToken);
  const currentUser = useAppSelector(selectCurrentUser);
  const role = currentUser?.role;

  const { data: profile } = useGetProfileQuery(undefined, {
    skip: !accessToken,
  });

  useEffect(() => {
    if (profile?.role && profile.role !== role) {
      dispatch(updateUserRole(profile.role));
      syncAuthCookies(accessToken, profile.role);
    }
  }, [profile?.role, role, accessToken, dispatch]);

  useLayoutEffect(() => {
    if (!accessToken) return;
    syncAuthCookies(accessToken, profile?.role || role);
  }, [accessToken, role, profile?.role]);

  return null;
}

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  // Public landing content must be discoverable before browser storage rehydrates.
  // Keep every other route behind the existing persistence gate.
  const isLandingPage = usePathname() === "/";
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {(bootstrapped) => (
          <>
            {bootstrapped && <AuthCookieSync />}
            {bootstrapped && <CrossTabLogoutListener />}
            {(bootstrapped || isLandingPage) ? children : null}
            <Toaster position="top-center" />
          </>
        )}
      </PersistGate>
    </Provider>
  );
}
