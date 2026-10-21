import { beforeAll, describe, expect, it } from "vitest";
import { createSeedWorkspace } from "../server/seed.js";

let executeAgentAction: typeof import("../server/agents.js").executeAgentAction;

beforeAll(async () => {
  delete process.env.OPENAI_API_KEY;
  ({ executeAgentAction } = await import("../server/agents.js"));
});

describe("local agent reasoning", () => {
  it("plans tracked moves without duplicating the board", async () => {
    const workspace = createSeedWorkspace();
    const outcome = await executeAgentAction(workspace, "atlas", "plan");
    expect(outcome.message.length).toBeGreaterThan(20);
    expect(outcome.tasks.length).toBeGreaterThan(0);
    expect(outcome.activity.type).toBe("agent");

    workspace.tasks.push(
      ...outcome.tasks.map((task, index) => ({
        id: `new-${index}`,
        title: task.title,
        status: "todo" as const,
        agentId: task.agentId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
    );
    const again = await executeAgentAction(workspace, "atlas", "plan");
    expect(again.tasks).toHaveLength(0);
  });

  it("builds a scaffold file and claims the next move", async () => {
    const workspace = createSeedWorkspace();
    const outcome = await executeAgentAction(workspace, "nova", "build");
    expect(outcome.files).toHaveLength(1);
    expect(outcome.files[0].path).toMatch(/^src\/.+\.js$/);
    expect(outcome.files[0].content).toContain("export function");
    expect(outcome.claimTaskIds.length).toBe(1);
    expect(outcome.message).toContain("Scaffolded");
  });

  it("reviews the workspace and reports a concrete result", async () => {
    const workspace = createSeedWorkspace();
    const outcome = await executeAgentAction(workspace, "sage", "review");
    expect(outcome.message).toContain("Review pass");
    expect(outcome.activity.text).toContain("Reviewed");
  });

  it("routes test moves to a runnable file", async () => {
    const workspace = createSeedWorkspace();
    const outcome = await executeAgentAction(workspace, "echo", "test");
    expect(outcome.runFileId).toBe("file_test");
  });

  it("answers a mention with agent-specific context", async () => {
    const workspace = createSeedWorkspace();
    const outcome = await executeAgentAction(workspace, "echo", "chat", {
      mention: "@Echo how are the tests looking?",
    });
    expect(outcome.message).toMatch(/sandbox|test/i);
    expect(outcome.files).toHaveLength(0);
    expect(outcome.tasks).toHaveLength(0);
  });
});
