import { io, type Socket } from "socket.io-client";

export function createSocket(): Socket {
  return io({
    path: "/socket.io",
    transports: ["websocket"],
    reconnectionDelayMax: 4_000,
  });
}
