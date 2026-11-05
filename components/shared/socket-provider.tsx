"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import { useAppDispatch, useAppSelector } from "@/redux/hook";
import { baseApi } from "@/redux/api/baseApi";
import { registerServiceWorker, showDesktopNotification } from "@/lib/push-notification";
import { useLanguage } from "@/lib/i18n/LanguageContext";

import { useRecordActivityMutation } from "@/redux/features/stats/statsApi";

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();
  const accessToken = useAppSelector(state => state.auth.accessToken);
  const role = useAppSelector(state => state.auth.user?.role);
  const dispatch = useAppDispatch();
  const [recordActivity] = useRecordActivityMutation();
  useEffect(() => {
    if (!accessToken) return;
    let inFlight = false;
    const send = () => {
      if (document.hidden || inFlight) return;
      inFlight = true;
      const request = recordActivity();
      void request.unwrap().catch(() => {}).finally(() => { inFlight = false; request.reset(); });
    };
    const socket = getSocket();
    send();
    const interval = setInterval(send, 30000);
    document.addEventListener("visibilitychange", send);
    socket?.on("connect", send);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", send); socket?.off("connect", send); };
  }, [accessToken, recordActivity]);
  useEffect(() => {
    if (!["admin", "super_admin"].includes(role || "")) return;
    const socket = getSocket();
    const refresh = () => { if (!document.hidden) dispatch(baseApi.util.invalidateTags(["Stats"])); };
    socket?.on("stats-updated", refresh);
    socket?.on("connect", refresh);
    return () => { socket?.off("stats-updated", refresh); socket?.off("connect", refresh); };
  }, [role, dispatch]);

  useEffect(() => {
    // 1. Initialize socket connection
    const socket = getSocket();

    // 2. Register Service Worker for Desktop Push
    registerServiceWorker();

    if (!socket) return;

    // 3. Global socket listener for native desktop notifications
    const handleGlobalNotification = (payload: any) => {
      const notif = payload?.data;
      if (!notif) return;

      const titleStr =
        typeof notif.title === "object"
          ? notif.title[language] || notif.title.en || notif.title.es || "Roadtripeado"
          : notif.title || "Roadtripeado";

      const contentStr =
        typeof notif.content === "object"
          ? notif.content[language] || notif.content.en || notif.content.es || ""
          : notif.content || "";

      showDesktopNotification(titleStr, {
        body: contentStr,
        url: notif.actionUrl || "/notifications",
      });
    };

    socket.on("notification", handleGlobalNotification);

    return () => {
      socket.off("notification", handleGlobalNotification);
    };
  }, [language]);

  return <>{children}</>;
}
