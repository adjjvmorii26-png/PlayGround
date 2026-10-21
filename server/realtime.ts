import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import type { Presence } from "../shared/types.js";
import { colorFromString, now } from "./lib.js";
import { MAX_FILE_BYTES, REDIS_URL } from "./config.js";
import type { WorkspaceStore } from "./store.js";

interface JoinPayload {
  workspaceId?: string;
  user?: { id?: string; name?: string };
  fileId?: string | null;
}

interface ChangePayload {
  workspaceId?: string;
  fileId?: string;
  content?: string;
  userName?: string;
}

interface PresenceData extends Presence {
  workspaceId: string;
}

async function roomPresence(io: Server, workspaceId: string): Promise<Presence[]> {
  const sockets = await io.in(workspaceId).fetchSockets();
  return sockets
    .map((socket) => socket.data?.presence as PresenceData | undefined)
    .filter((presence): presence is PresenceData => Boolean(presence?.workspaceId === workspaceId))
    .map(({ workspaceId: _workspaceId, ...presence }) => presence)
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function broadcastPresence(io: Server, workspaceId: string): Promise<Presence[]> {
  const people = await roomPresence(io, workspaceId);
  io.to(workspaceId).emit("presence:update", people);
  return people;
}

export interface Realtime {
  io: Server;
  close: () => Promise<void>;
}

export async function attachRealtime(
  server: HttpServer,
  store: WorkspaceStore,
): Promise<Realtime> {
  const io = new Server(server, {
    cors: { origin: true, credentials: true },
    maxHttpBufferSize: 1_000_000,
    serveClient: false,
  });

  let pubClient: Redis | null = null;
  let subClient: Redis | null = null;
  if (REDIS_URL) {
    pubClient = new Redis(REDIS_URL, { maxRetriesPerRequest: 3 });
    subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
  }

  io.on("connection", (socket) => {
    let workspaceId: string | null = null;

    socket.on("workspace:join", async (payload: JoinPayload, ack?: (value: unknown) => void) => {
      const id = typeof payload?.workspaceId === "string" ? payload.workspaceId : "";
      const name = payload?.user?.name?.trim().slice(0, 40) || "Guest";
      const userId = payload?.user?.id?.trim().slice(0, 64) || socket.id;
      if (!id) {
        ack?.({ ok: false, error: "workspaceId is required" });
        return;
      }

      const workspace = await store.get(id);
      if (!workspace) {
        ack?.({ ok: false, error: "Workspace not found" });
        return;
      }

      const previous = workspaceId;
      if (previous) socket.leave(previous);

      workspaceId = id;
      socket.join(id);
      socket.data.presence = {
        socketId: socket.id,
        workspaceId: id,
        userId,
        name,
        kind: "human",
        color: colorFromString(userId),
        status: "online",
        fileId: payload.fileId ?? undefined,
      } satisfies PresenceData;

      if (previous) void broadcastPresence(io, previous);
      const people = await broadcastPresence(io, id);
      ack?.({ ok: true, presence: people });
    });

    socket.on("file:cursor", (payload: { workspaceId?: string; fileId?: string | null }) => {
      if (!workspaceId || payload?.workspaceId !== workspaceId) return;
      const member = socket.data.presence as PresenceData | undefined;
      if (!member) return;
      member.fileId = typeof payload.fileId === "string" ? payload.fileId : undefined;
      void broadcastPresence(io, workspaceId);
    });

    socket.on(
      "file:change",
      async (
        payload: ChangePayload,
        ack?: (value: { ok: boolean; revision?: number; error?: string }) => void,
      ) => {
          const id = workspaceId;
          if (!id || payload?.workspaceId !== id) {
            ack?.({ ok: false, error: "Join the workspace first" });
            return;
          }
          if (typeof payload.fileId !== "string" || typeof payload.content !== "string") {
            ack?.({ ok: false, error: "fileId and content are required" });
            return;
          }
          if (Buffer.byteLength(payload.content, "utf8") > MAX_FILE_BYTES) {
            ack?.({ ok: false, error: "File is too large" });
            return;
          }
          const author = payload.userName?.trim().slice(0, 40) || "Guest";
          try {
            const updated = await store.update(id, (workspace) => {
              const file = workspace.files.find((entry) => entry.id === payload.fileId);
              if (!file) throw new Error("File not found");
              file.content = payload.content as string;
              file.updatedAt = now();
              file.updatedBy = author;
            });
            const file = updated.files.find((entry) => entry.id === payload.fileId);
            socket.to(id).emit("file:updated", {
              fileId: payload.fileId,
              content: payload.content,
              updatedBy: author,
              updatedAt: file?.updatedAt ?? now(),
              revision: updated.revision,
            });
            ack?.({ ok: true, revision: updated.revision });
          } catch (error) {
            ack?.({ ok: false, error: (error as Error).message });
          }
        },
      );
    socket.on("workspace:leave", () => {
      if (!workspaceId) return;
      const left = workspaceId;
      socket.leave(left);
      delete socket.data.presence;
      workspaceId = null;
      void broadcastPresence(io, left);
    });

    socket.on("disconnect", () => {
      if (!workspaceId) return;
      const left = workspaceId;
      delete socket.data.presence;
      void broadcastPresence(io, left);
    });
  });

  return {
    io,
    async close() {
      await new Promise<void>((resolve) => io.close(() => resolve()));
      await Promise.all([
        pubClient?.quit().catch(() => undefined),
        subClient?.quit().catch(() => undefined),
      ]);
    },
  };
}
