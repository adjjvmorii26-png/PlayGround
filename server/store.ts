import { promises as fs } from "node:fs";
import path from "node:path";
import Redis from "ioredis";
import type { Workspace } from "../shared/types.js";
import { HttpError, now } from "./lib.js";

export type WorkspaceMutator = (workspace: Workspace) => void | Promise<void>;

export interface WorkspaceStore {
  readonly kind: "file" | "redis";
  list(): Promise<Workspace[]>;
  get(id: string): Promise<Workspace | null>;
  create(workspace: Workspace): Promise<Workspace>;
  update(id: string, mutator: WorkspaceMutator): Promise<Workspace>;
  close(): Promise<void>;
}

interface FileShape {
  version: 1;
  workspaces: Workspace[];
}

export class FileStore implements WorkspaceStore {
  readonly kind = "file" as const;
  private cache: Map<string, Workspace> | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  private async load(): Promise<Map<string, Workspace>> {
    if (this.cache) return this.cache;
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as FileShape;
      this.cache = new Map(
        (parsed.workspaces ?? []).map((workspace) => [workspace.id, workspace]),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      this.cache = new Map();
    }
    return this.cache;
  }

  private async persist(): Promise<void> {
    const cache = await this.load();
    const payload: FileShape = {
      version: 1,
      workspaces: [...cache.values()],
    };
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const temp = `${this.filePath}.${process.pid}.tmp`;
    await fs.writeFile(temp, JSON.stringify(payload, null, 2), "utf8");
    await fs.rename(temp, this.filePath);
  }

  private serialize<T>(task: () => Promise<T>): Promise<T> {
    const next = this.queue.then(task, task);
    this.queue = next.catch(() => undefined);
    return next;
  }

  async list(): Promise<Workspace[]> {
    await this.queue;
    const cache = await this.load();
    return [...cache.values()]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((workspace) => structuredClone(workspace));
  }

  async get(id: string): Promise<Workspace | null> {
    await this.queue;
    const cache = await this.load();
    const workspace = cache.get(id);
    return workspace ? structuredClone(workspace) : null;
  }

  create(workspace: Workspace): Promise<Workspace> {
    return this.serialize(async () => {
      const cache = await this.load();
      if (cache.has(workspace.id)) {
        throw new HttpError(409, "Workspace already exists");
      }
      cache.set(workspace.id, structuredClone(workspace));
      await this.persist();
      return structuredClone(workspace);
    });
  }

  update(id: string, mutator: WorkspaceMutator): Promise<Workspace> {
    return this.serialize(async () => {
      const cache = await this.load();
      const current = cache.get(id);
      if (!current) throw new HttpError(404, "Workspace not found");
      const draft = structuredClone(current);
      await mutator(draft);
      draft.revision = current.revision + 1;
      draft.updatedAt = now();
      cache.set(id, draft);
      await this.persist();
      return structuredClone(draft);
    });
  }

  async close(): Promise<void> {
    await this.queue;
  }
}

export class RedisStore implements WorkspaceStore {
  readonly kind = "redis" as const;
  private readonly redis: Redis;
  private readonly indexKey = "atelier:workspaces";

  constructor(url: string) {
    this.redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });
  }

  private key(id: string): string {
    return `atelier:workspace:${id}`;
  }

  async list(): Promise<Workspace[]> {
    const ids = await this.redis.smembers(this.indexKey);
    if (ids.length === 0) return [];
    const rows = await this.redis.mget(ids.map((id) => this.key(id)));
    return rows
      .filter((row): row is string => Boolean(row))
      .map((row) => JSON.parse(row) as Workspace)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string): Promise<Workspace | null> {
    const row = await this.redis.get(this.key(id));
    return row ? (JSON.parse(row) as Workspace) : null;
  }

  async create(workspace: Workspace): Promise<Workspace> {
    const exists = await this.redis.exists(this.key(workspace.id));
    if (exists) throw new HttpError(409, "Workspace already exists");
    await this.redis
      .multi()
      .set(this.key(workspace.id), JSON.stringify(workspace))
      .sadd(this.indexKey, workspace.id)
      .exec();
    return structuredClone(workspace);
  }

  async update(id: string, mutator: WorkspaceMutator): Promise<Workspace> {
    const key = this.key(id);
    for (let attempt = 0; attempt < 24; attempt += 1) {
      await this.redis.watch(key);
      const row = await this.redis.get(key);
      if (!row) {
        await this.redis.unwatch();
        throw new HttpError(404, "Workspace not found");
      }
      const current = JSON.parse(row) as Workspace;
      const draft = structuredClone(current);
      try {
        await mutator(draft);
      } catch (error) {
        await this.redis.unwatch();
        throw error;
      }
      draft.revision = current.revision + 1;
      draft.updatedAt = now();
      const result = await this.redis
        .multi()
        .set(key, JSON.stringify(draft))
        .exec();
      if (result) return structuredClone(draft);
    }
    throw new HttpError(409, "Workspace was modified repeatedly, try again");
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}

export function createStore(): WorkspaceStore {
  const url = process.env.REDIS_URL?.trim();
  if (url) return new RedisStore(url);
  return new FileStore(
    process.env.ATELIER_DATA_FILE ??
      path.resolve(process.cwd(), "data", "workspaces.json"),
  );
}
