import { describe, expect, it } from "vitest";
import { createSeedWorkspace } from "../server/seed.js";
import { runWorkspaceFile } from "../server/runner.js";

describe("sandbox runner", () => {
  it("runs the entry point in a throwaway workspace", async () => {
    const workspace = createSeedWorkspace();
    const result = await runWorkspaceFile(workspace, "file_main", {
      mode: "local",
      timeoutMs: 8_000,
      memoryMb: 256,
    });
    expect(result.status).toBe("success");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Aster-9");
    expect(result.stdout).toContain("total");
    expect(result.stderr).toBe("");
  });

  it("runs the node test suite", async () => {
    const workspace = createSeedWorkspace();
    const result = await runWorkspaceFile(workspace, "file_test", {
      mode: "local",
      timeoutMs: 8_000,
      memoryMb: 256,
    });
    expect(result.status).toBe("success");
    expect(result.stdout).toContain("# pass 4");
    expect(result.stdout).toContain("# fail 0");
  });

  it("rejects a non-runnable file", async () => {
    const workspace = createSeedWorkspace();
    await expect(
      runWorkspaceFile(workspace, "file_readme", {
        mode: "local",
        timeoutMs: 8_000,
        memoryMb: 256,
      }),
    ).rejects.toThrow(/Select a JavaScript/);
  });

  it("kills a runaway process at the time limit", async () => {
    const workspace = createSeedWorkspace();
    workspace.files.push({
      id: "file_loop",
      path: "src/loop.js",
      language: "javascript",
      content: "while (true) {}\n",
      updatedAt: new Date().toISOString(),
      updatedBy: "echo",
    });
    const started = Date.now();
    const result = await runWorkspaceFile(workspace, "file_loop", {
      mode: "local",
      timeoutMs: 700,
      memoryMb: 128,
    });
    expect(result.status).toBe("timeout");
    expect(result.exitCode).toBeNull();
    expect(Date.now() - started).toBeLessThan(5_000);
  }, 10_000);
});
