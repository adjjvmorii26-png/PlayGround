import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { FileStore } from "../server/store.js";
import { createBlankWorkspace } from "../server/seed.js";

let dir = "";

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "atelier-store-"));
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("FileStore", () => {
  it("creates, reads, and persists workspaces", async () => {
    const file = path.join(dir, "workspaces.json");
    const store = new FileStore(file);
    const workspace = createBlankWorkspace("Test Space");
    await store.create(workspace);

    const listed = await store.list();
    expect(listed).toHaveLength(1);
    expect(listed[0].name).toBe("Test Space");

    const loaded = await store.get(workspace.id);
    expect(loaded?.files.map((entry) => entry.path)).toContain("src/main.js");

    const updated = await store.update(workspace.id, (draft) => {
      draft.tasks.push({
        id: "task-test",
        title: "A tracked move",
        status: "todo",
        agentId: "nova",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
    expect(updated.revision).toBe(workspace.revision + 1);
    expect(updated.tasks).toHaveLength(1);

    const reloaded = new FileStore(file);
    const persisted = await reloaded.get(workspace.id);
    expect(persisted?.tasks[0].title).toBe("A tracked move");
    expect(persisted?.revision).toBe(updated.revision);
    await store.close();
    await reloaded.close();
  });

  it("serializes concurrent writes", async () => {
    const store = new FileStore(path.join(dir, "workspaces.json"));
    const workspace = createBlankWorkspace("Concurrent");
    await store.create(workspace);

    await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        store.update(workspace.id, (draft) => {
          draft.description = `revision ${index}`;
        }),
      ),
    );

    const loaded = await store.get(workspace.id);
    expect(loaded?.revision).toBe(workspace.revision + 8);
    await store.close();
  });
});
