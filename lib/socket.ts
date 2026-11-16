"use client";

import { env } from "@/lib/config";
import { io, Socket } from "socket.io-client";
import { getApiEndpoints } from "@/lib/api-endpoints";

let socket: Socket | null = null;
let flushBound = false;
const pending: Array<{ event: string; payload: unknown }> = [];

const endpoints = getApiEndpoints(env.NEXT_PUBLIC_BASEURL.trim());

const flushPending = () => {
  if (!socket?.connected) return;
  while (pending.length) {
    const item = pending.shift();
    if (item) socket.emit(item.event, item.payload);
  }
};

export const getSocket = (): Socket | null => {
  if (typeof window === "undefined") return null;

  const getToken = () => {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("accessToken="))
      ?.split("=")
      .slice(1)
      .join("=");
  };

  const rawToken = getToken();
  const token = rawToken ? decodeURIComponent(rawToken) : undefined;

  if (socket) {
    if (token && (socket.auth as any)?.token !== token) {
      socket.auth = { token };
      if (!socket.connected) {
        socket.connect();
      }
    }
    return socket;
  }

  socket = io(endpoints.socketOrigin, {
    path: endpoints.socketPath,
    transports: ["polling", "websocket"],
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    auth: {
      token,
    },
  });

  if (!flushBound) {
    socket.on("connect", () => {
      flushPending();
    });
    flushBound = true;
  }

  return socket;
};

export const emitWhenReady = (event: string, payload: unknown) => {
  const client = getSocket();
  if (!client) return;

  if (client.connected) {
    client.emit(event, payload);
    return;
  }

  pending.push({ event, payload });
  if (!client.active) client.connect();
};
