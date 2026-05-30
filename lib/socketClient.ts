"use client";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(type: "host" | "overlay" | "admin" = "host"): Socket {
  if (!socket) {
    socket = io(typeof window !== "undefined" ? window.location.origin : "http://localhost:3000", {
      query: { type },
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
