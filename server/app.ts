import express, { type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import type { Server } from "socket.io";
import type {
  Activity,
  AgentId,
  ChatMessage,
  RunResult,
  Workspace,
  WorkspaceSummary,
} from "../shared/types.js";
import { LLM, MAX_FILE_BYTES, MAX_MESSAGE_CHARS, RUN_TIMEOUT_MS, SANDBOX_MEMORY_MB, SANDBOX_MODE, VERSION } from "./config.js";
import {
  HttpError,
  asError,
  id,
  languageFromPath,
  now,
  sanitizePath,
  truncate,
} from "./lib.js";
import { executeAgentAction, type AgentOutcome } from "./agents.js";
import { runWorkspaceFile } from "./runner.js";
import { createBlankWorkspace } from "./seed.js";
import type { WorkspaceStore } from "./store.js";

interface AppOptions {
  store: WorkspaceStore;
  getIo: () => Server;
}

const ACTIVE_AGENTS: AgentId[] = ["atlas", "nova", "sage", "echo"];
const STATUSES = ["todo", "in_progress", "done"] as const;

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(48),
  description: z.string().trim().max(160).optional(),
});

const createFileSchema = z.object({
  path: z.string().min(1).max(140),
  content: z.string().max(MAX_FILE_BYTES).optional(),
  authorName: z.string().trim().max(40).optional(),
});

const updateFileSchema = z
  .object({
    content: z.string().max(MAX_FILE_BYTES).optional(),
    path: z.string().min(1).max(140).optional(),
    authorName: z.string().trim().max(40).optional(),
  })
  .refine((value) => value.content !== undefined || value.path !== undefined, {
    message: "Nothing to update",
  });

const messageSchema = z.object({
  text: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
  authorName: z.string().trim().max(40).optional(),
  authorId: z.string().trim().max(64).optional(),
});

const runSchema = z.object({
  fileId: z.string().min(1),
  authorName: z.string().trim().max(40).optional(),
});

const agentActionSchema = z.object({
  action: z.enum(["plan", "build", "review", "test", "chat"]),
  mention: z.string().trim().max(2_000).optional(),
});

const taskSchema = z.object({
  title: z.string().trim().min(3).max(160),
  agentId: z.enum(["atlas", "nova", "sage", "echo"]).nullable().optional(),
});

const taskUpdateSchema = z.object({
  status: z.enum(STATUSES),
});

function wrap(
  handler: (req: Request, res: Response) => Promise<unknown>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    handler(req, res).catch(next);
  };
}

function addActivity(
  workspace: Workspace,
  activity: Omit<Activity, "id" | "createdAt">,
): void {
  workspace.activity.push({ ...activity, id: id("act"), createdAt: now() });
  if (workspace.activity.length > 140) {
    workspace.activity.splice(0, workspace.activity.length - 140);
  }
}

function addMessage(
  workspace: Workspace,
  message: Omit<ChatMessage, "id" | "createdAt">,
): ChatMessage {
  const entry: ChatMessage = { ...message, id: id("msg"), createdAt: now() };
  workspace.messages.push(entry);
  if (workspace.messages.length > 240) {
    workspace.messages.splice(0, workspace.messages.length - 240);
  }
  return entry;
}

function summarize(workspace: Workspace): WorkspaceSummary {
  return {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    updatedAt: workspace.updatedAt,
    fileCount: workspace.files.length,
    taskCount: workspace.tasks.length,
    openTasks: workspace.tasks.filter((task) => task.status !== "done").length,
    agentsOnline: workspace.agents.filter((agent) => agent.status !== "idle").length,
  };
}

function runRoomSummary(run: RunResult): string {
  const label =
    run.status === "success"
      ? `Sandbox passed in ${run.durationMs}ms.`
      : run.status === "timeout"
        ? `Sandbox timed out after ${run.durationMs}ms.`
        : `Sandbox exited with code ${run.exitCode} in ${run.durationMs}ms.`;
  const output = truncate(
    [run.stdout, run.stderr].filter(Boolean).join("\n").trim().split("\n").slice(-18).join("\n"),
    1_500,
  );
  return output ? `${label}\n\n\`\`\`\n${output}\n\`\`\`` : label;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createApp({ store, getIo }: AppOptions) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  const emit = (workspace: Workspace) => {
    getIo().to(workspace.id).emit("workspace:updated", workspace);
  };

  async function requireWorkspace(workspaceId: string): Promise<Workspace> {
    const workspace = await store.get(workspaceId);
    if (!workspace) throw new HttpError(404, "Workspace not found");
    return workspace;
  }

  async function applyOutcome(
    workspaceId: string,
    agentId: AgentId,
    outcome: AgentOutcome,
    run: RunResult | null,
  ): Promise<Workspace> {
    const updated = await store.update(workspaceId, (workspace) => {
      const agent = workspace.agents.find((entry) => entry.id === agentId);
      const agentName = agent?.name ?? agentId;

      for (const change of outcome.files.slice(0, 3)) {
        let target: string;
        try {
          target = sanitizePath(change.path);
        } catch {
          continue;
        }
        const content = change.content.slice(0, MAX_FILE_BYTES);
        const existing = workspace.files.find((file) => file.path === target);
        if (existing) {
          existing.content = content;
          existing.language = languageFromPath(target);
          existing.updatedAt = now();
          existing.updatedBy = agentName;
        } else {
          workspace.files.push({
            id: id("file"),
            path: target,
            language: languageFromPath(target),
            content,
            updatedAt: now(),
            updatedBy: agentName,
          });
        }
        addActivity(workspace, {
          type: "file",
          actorId: agentId,
          actorName: agentName,
          actorKind: "agent",
          text: `${existing ? "Updated" : "Created"} ${target}.`,
        });
      }

      for (const taskId of outcome.claimTaskIds) {
        const task = workspace.tasks.find((entry) => entry.id === taskId);
        if (task && task.status !== "done") {
          task.status = "in_progress";
          task.agentId = agentId;
          task.updatedAt = now();
        }
      }

      for (const taskId of outcome.completeTaskIds) {
        const task = workspace.tasks.find((entry) => entry.id === taskId);
        if (task) {
          task.status = "done";
          task.updatedAt = now();
        }
      }

      const existingTitles = new Set(
        workspace.tasks.map((task) => task.title.toLowerCase()),
      );
      for (const task of outcome.tasks.slice(0, 5)) {
        if (existingTitles.has(task.title.toLowerCase())) continue;
        const timestamp = now();
        workspace.tasks.push({
          id: id("task"),
          title: task.title.slice(0, 160),
          status: "todo",
          agentId: task.agentId,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        existingTitles.add(task.title.toLowerCase());
      }

      addActivity(workspace, {
        type: outcome.activity.type,
        actorId: agentId,
        actorName: agentName,
        actorKind: "agent",
        text: outcome.activity.text,
      });

      addMessage(workspace, {
        authorId: agentId,
        authorName: agentName,
        authorKind: "agent",
        agentId,
        text: outcome.message,
      });

      if (run) workspace.lastRun = run;
      const current = workspace.agents.find((entry) => entry.id === agentId);
      if (current) current.status = "idle";
    });

    emit(updated);
    getIo().to(workspaceId).emit("agent:typing", { agentId, status: "idle" });
    return updated;
  }

  async function replyToMention(
    workspaceId: string,
    agentId: AgentId,
    text: string,
  ): Promise<void> {
    const io = getIo();
    try {
      io.to(workspaceId).emit("agent:typing", { agentId, status: "thinking" });
      const thinking = await store.update(workspaceId, (workspace) => {
        const agent = workspace.agents.find((entry) => entry.id === agentId);
        if (agent) agent.status = "thinking";
      });
      emit(thinking);
      await sleep(900);
      const workspace = await requireWorkspace(workspaceId);
      const outcome = await executeAgentAction(workspace, agentId, "chat", {
        mention: text,
      });
      await applyOutcome(workspaceId, agentId, outcome, null);
    } catch (error) {
      console.error("[atelier] mention reply failed:", asError(error).message);
      const reset = await store
        .update(workspaceId, (workspace) => {
          const agent = workspace.agents.find((entry) => entry.id === agentId);
          if (agent) agent.status = "idle";
        })
        .catch(() => null);
      if (reset) emit(reset);
      io.to(workspaceId).emit("agent:typing", { agentId, status: "idle" });
    }
  }

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      version: VERSION,
      storage: store.kind,
      realtime: process.env.REDIS_URL ? "redis" : "memory",
      sandbox: SANDBOX_MODE,
      llm: LLM.enabled,
      uptimeSeconds: Math.round(process.uptime()),
    });
  });

  app.get(
    "/api/workspaces",
    wrap(async (_req, res) => {
      const workspaces = await store.list();
      res.json(workspaces.map(summarize));
    }),
  );

  app.post(
    "/api/workspaces",
    wrap(async (req, res) => {
      const body = createWorkspaceSchema.parse(req.body);
      const existing = await store.list();
      if (existing.length >= 40) {
        throw new HttpError(429, "Workspace limit reached for this instance");
      }
      const workspace = createBlankWorkspace(body.name);
      if (body.description) workspace.description = body.description;
      const created = await store.create(workspace);
      emit(created);
      res.status(201).json(created);
    }),
  );

  app.get(
    "/api/workspaces/:id",
    wrap(async (req, res) => {
      const workspace = await requireWorkspace(req.params.id);
      res.json(workspace);
    }),
  );

  app.post(
    "/api/workspaces/:id/files",
    wrap(async (req, res) => {
      const body = createFileSchema.parse(req.body);
      const target = sanitizePath(body.path);
      const author = body.authorName?.trim() || "Guest";
      const updated = await store.update(req.params.id, (draft) => {
        if (draft.files.some((file) => file.path === target)) {
          throw new HttpError(409, "A file already exists at that path");
        }
        if (draft.files.length >= 80) {
          throw new HttpError(429, "File limit reached for this workspace");
        }
        draft.files.push({
          id: id("file"),
          path: target,
          language: languageFromPath(target),
          content: body.content ?? "",
          updatedAt: now(),
          updatedBy: author,
        });
        addActivity(draft, {
          type: "file",
          actorId: "human",
          actorName: author,
          actorKind: "human",
          text: `Created ${target}.`,
        });
      });
      emit(updated);
      res.status(201).json(updated);
    }),
  );

  app.patch(
    "/api/workspaces/:id/files/:fileId",
    wrap(async (req, res) => {
      const body = updateFileSchema.parse(req.body);
      const author = body.authorName?.trim() || "Guest";
      const updated = await store.update(req.params.id, (workspace) => {
        const file = workspace.files.find((entry) => entry.id === req.params.fileId);
        if (!file) throw new HttpError(404, "File not found");
        if (body.path !== undefined) {
          const target = sanitizePath(body.path);
          if (
            workspace.files.some(
              (entry) => entry.id !== file.id && entry.path === target,
            )
          ) {
            throw new HttpError(409, "A file already exists at that path");
          }
          file.path = target;
          file.language = languageFromPath(target);
        }
        if (body.content !== undefined) file.content = body.content;
        file.updatedAt = now();
        file.updatedBy = author;
      });
      emit(updated);
      res.json(updated);
    }),
  );

  app.delete(
    "/api/workspaces/:id/files/:fileId",
    wrap(async (req, res) => {
      const author = typeof req.query.authorName === "string" ? req.query.authorName : "Guest";
      const updated = await store.update(req.params.id, (workspace) => {
        const index = workspace.files.findIndex(
          (entry) => entry.id === req.params.fileId,
        );
        if (index === -1) throw new HttpError(404, "File not found");
        const [removed] = workspace.files.splice(index, 1);
        addActivity(workspace, {
          type: "file",
          actorId: "human",
          actorName: author,
          actorKind: "human",
          text: `Deleted ${removed.path}.`,
        });
      });
      emit(updated);
      res.json(updated);
    }),
  );

  app.post(
    "/api/workspaces/:id/run",
    wrap(async (req, res) => {
      const body = runSchema.parse(req.body);
      const workspace = await requireWorkspace(req.params.id);
      const author = body.authorName?.trim() || "Guest";
      const run = await runWorkspaceFile(workspace, body.fileId, {
        mode: SANDBOX_MODE,
        timeoutMs: workspace.settings.timeoutMs ?? RUN_TIMEOUT_MS,
        memoryMb: workspace.settings.memoryMb ?? SANDBOX_MEMORY_MB,
      });
      const updated = await store.update(req.params.id, (draft) => {
        draft.lastRun = run;
        addActivity(draft, {
          type: "run",
          actorId: "human",
          actorName: author,
          actorKind: "human",
          text: `Ran ${run.filePath} — ${run.status} in ${run.durationMs}ms.`,
        });
      });
      emit(updated);
      res.json({ run, workspace: updated });
    }),
  );

  app.post(
    "/api/workspaces/:id/messages",
    wrap(async (req, res) => {
      const body = messageSchema.parse(req.body);
      const author = body.authorName?.trim() || "Guest";
      const authorId = body.authorId?.trim() || "human";
      const updated = await store.update(req.params.id, (workspace) => {
        addMessage(workspace, {
          authorId,
          authorName: author,
          authorKind: "human",
          text: body.text,
        });
      });
      emit(updated);
      res.status(201).json(updated);

      const mention = /@(atlas|nova|sage|echo)\b/i.exec(body.text);
      if (mention) {
        const agentId = mention[1].toLowerCase() as AgentId;
        void replyToMention(req.params.id, agentId, body.text);
      }
    }),
  );

  app.post(
    "/api/workspaces/:id/agents/:agentId/actions",
    wrap(async (req, res) => {
      const agentId = req.params.agentId as AgentId;
      if (!ACTIVE_AGENTS.includes(agentId)) {
        throw new HttpError(404, "Unknown agent");
      }
      const body = agentActionSchema.parse(req.body);
      const workspace = await requireWorkspace(req.params.id);
      const io = getIo();
      io.to(workspace.id).emit("agent:typing", { agentId, status: "thinking" });

      const thinking = await store.update(workspace.id, (draft) => {
        const agent = draft.agents.find((entry) => entry.id === agentId);
        if (agent) agent.status = "thinking";
      });
      emit(thinking);

      try {
        const outcome = await executeAgentAction(workspace, agentId, body.action, {
          mention: body.mention,
        });
        let run: RunResult | null = null;
        if (outcome.runFileId) {
          run = await runWorkspaceFile(workspace, outcome.runFileId, {
            mode: SANDBOX_MODE,
            timeoutMs: workspace.settings.timeoutMs ?? RUN_TIMEOUT_MS,
            memoryMb: workspace.settings.memoryMb ?? SANDBOX_MEMORY_MB,
          });
          outcome.message = `${outcome.message}\n\n${runRoomSummary(run)}`;
        }
        const updated = await applyOutcome(workspace.id, agentId, outcome, run);
        res.json({ workspace: updated, outcome });
      } catch (error) {
        const reset = await store
          .update(workspace.id, (draft) => {
            const agent = draft.agents.find((entry) => entry.id === agentId);
            if (agent) agent.status = "idle";
          })
          .catch(() => null);
        if (reset) emit(reset);
        io.to(workspace.id).emit("agent:typing", { agentId, status: "idle" });
        throw error;
      }
    }),
  );

  app.post(
    "/api/workspaces/:id/tasks",
    wrap(async (req, res) => {
      const body = taskSchema.parse(req.body);
      const updated = await store.update(req.params.id, (workspace) => {
        const timestamp = now();
        workspace.tasks.push({
          id: id("task"),
          title: body.title,
          status: "todo",
          agentId: body.agentId ?? null,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        addActivity(workspace, {
          type: "task",
          actorId: "human",
          actorName: "You",
          actorKind: "human",
          text: `Added a task: ${body.title}`,
        });
      });
      emit(updated);
      res.status(201).json(updated);
    }),
  );

  app.patch(
    "/api/workspaces/:id/tasks/:taskId",
    wrap(async (req, res) => {
      const body = taskUpdateSchema.parse(req.body);
      const updated = await store.update(req.params.id, (workspace) => {
        const task = workspace.tasks.find((entry) => entry.id === req.params.taskId);
        if (!task) throw new HttpError(404, "Task not found");
        task.status = body.status;
        task.updatedAt = now();
        addActivity(workspace, {
          type: "task",
          actorId: "human",
          actorName: "You",
          actorKind: "human",
          text: `Moved "${task.title}" to ${body.status.replace("_", " ")}.`,
        });
      });
      emit(updated);
      res.json(updated);
    }),
  );

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Invalid request",
        details: error.issues.map((issue) => issue.message).join(", "),
      });
      return;
    }
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error("[atelier] unhandled request error:", error);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
