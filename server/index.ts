import { createServer } from "node:http";
import { existsSync } from "node:fs";
import path from "node:path";
import express from "express";
import type { Server } from "socket.io";
import { createApp } from "./app.js";
import { attachRealtime } from "./realtime.js";
import { createSeedWorkspace } from "./seed.js";
import { createStore } from "./store.js";
import { PORT, SANDBOX_MODE, VERSION } from "./config.js";

async function main() {
  const store = createStore();
  const workspaces = await store.list();
  if (workspaces.length === 0) {
    await store.create(createSeedWorkspace());
    console.log("[atelier] seeded the Orbital Lab workspace");
  }

  let io: Server | null = null;
  const app = createApp({
    store,
    getIo: () => {
      if (!io) throw new Error("Realtime server is not ready");
      return io;
    },
  });

  const staticDir = path.resolve(process.cwd(), "dist", "client");
  if (process.env.NODE_ENV === "production" && existsSync(staticDir)) {
    app.use(express.static(staticDir, { maxAge: "1h", index: false }));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) {
        next();
        return;
      }
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }

  const server = createServer(app);
  const realtime = await attachRealtime(server, store);
  io = realtime.io;

  await new Promise<void>((resolve) => {
    server.listen(PORT, "0.0.0.0", () => resolve());
  });

  console.log(
    `[atelier] v${VERSION} listening on http://localhost:${PORT} · storage=${store.kind} · sandbox=${SANDBOX_MODE} · redis=${process.env.REDIS_URL ? "on" : "off"}`,
  );
  if (process.env.NODE_ENV !== "production") {
    console.log("[atelier] web dev server: http://localhost:5173");
  }

  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;
    console.log(`[atelier] ${signal} received, closing`);
    const force = setTimeout(() => process.exit(1), 8_000);
    force.unref();
    await realtime.close().catch(() => undefined);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await store.close().catch(() => undefined);
    clearTimeout(force);
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error("[atelier] failed to start:", error);
  process.exit(1);
});
