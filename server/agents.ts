import type {
  ActivityType,
  AgentId,
  Agent,
  TaskStatus,
  Workspace,
} from "../shared/types.js";
import { LLM } from "./config.js";
import { slugify, truncate } from "./lib.js";

export interface AgentOutcome {
  message: string;
  activity: { type: ActivityType; text: string };
  files: Array<{ path: string; content: string }>;
  tasks: Array<{ title: string; agentId: AgentId | null }>;
  claimTaskIds: string[];
  completeTaskIds: string[];
  runFileId: string | null;
}

export interface AgentContext {
  mention?: string;
}

const AGENT_INSTRUCTIONS: Record<AgentId, string> = {
  atlas:
    "You are the architect. Break ambiguous work into small, ordered moves. Name tradeoffs. Do not write production code unless it clarifies a boundary.",
  nova:
    "You are the builder. Make the smallest complete change that moves the workspace forward. Prefer working code, clear names, and short comments.",
  sage:
    "You are the reviewer. Look for correctness, edge cases, unstated assumptions, and interface drift. Be specific and kind. Do not rewrite unless asked.",
  echo:
    "You are the runner. Focus on execution, test coverage, observable behaviour, and reproducible feedback from the sandbox.",
};

function agent(workspace: Workspace, agentId: AgentId): Agent {
  const found = workspace.agents.find((entry) => entry.id === agentId);
  if (!found) throw new Error(`Unknown agent: ${agentId}`);
  return found;
}

function openTasks(workspace: Workspace) {
  return workspace.tasks.filter((task) => task.status !== "done");
}

function sourceFiles(workspace: Workspace) {
  return workspace.files.filter(
    (file) => file.language === "javascript" || file.language === "python",
  );
}

function testFiles(workspace: Workspace) {
  return workspace.files.filter(
    (file) =>
      (file.path.includes("test") || file.path.includes("spec")) &&
      (file.language === "javascript" || file.language === "python"),
  );
}

function firstTaskFor(workspace: Workspace, agentId: AgentId) {
  return (
    workspace.tasks.find(
      (task) => task.status === "in_progress" && task.agentId === agentId,
    ) ??
    workspace.tasks.find(
      (task) => task.status === "todo" && task.agentId === agentId,
    ) ??
    workspace.tasks.find(
      (task) => task.status === "todo" && task.agentId === null,
    ) ??
    null
  );
}

function camelCase(value: string): string {
  const parts = slugify(value).split("-").filter(Boolean);
  if (parts.length === 0) return "scaffold";
  return parts
    .map((part, index) =>
      index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join("");
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "in",
  "into",
  "of",
  "on",
  "or",
  "our",
  "the",
  "this",
  "to",
  "with",
]);

function fileStem(title: string): string {
  const words = slugify(title)
    .split("-")
    .filter((word) => word && !STOP_WORDS.has(word));
  return (words.length ? words : slugify(title).split("-")).slice(0, 3).join("-");
}

function uniquePath(workspace: Workspace, desired: string): string {
  const existing = new Set(workspace.files.map((file) => file.path));
  if (!existing.has(desired)) return desired;
  const match = desired.match(/^(.*?)(\.[^.]+)$/);
  if (!match) return `${desired}-2`;
  let index = 2;
  while (existing.has(`${match[1]}-${index}${match[2]}`)) index += 1;
  return `${match[1]}-${index}${match[2]}`;
}

function localPlan(workspace: Workspace): AgentOutcome {
  const source = sourceFiles(workspace)[0];
  const existingTitles = new Set(
    workspace.tasks.map((task) => task.title.toLowerCase()),
  );
  const candidates = source
    ? [
        {
          title: `Add a regression test for ${source.path}`,
          agentId: "echo" as const,
        },
        {
          title: `Review ${source.path} for boundary conditions`,
          agentId: "sage" as const,
        },
      ]
    : [
        {
          title: "Create a runnable entry point",
          agentId: "nova" as const,
        },
        {
          title: "Add one end-to-end behavior check",
          agentId: "echo" as const,
        },
      ];

  const fresh = candidates.filter(
    (task) => !existingTitles.has(task.title.toLowerCase()),
  );
  const open = openTasks(workspace).length;
  const message = [
    `I mapped ${workspace.files.length} files into ${open + fresh.length} tracked moves.`,
    source
      ? `\`${source.path}\` is the load-bearing seam; Echo turns the risky path into a test while Sage reviews the interface.`
      : "There is no runnable source yet, so Nova goes first and Echo pins the behaviour.",
    fresh.length
      ? `I put ${fresh.length} new move${fresh.length === 1 ? "" : "s"} on the board.`
      : "The board already covers the obvious next moves — I would start at the top.",
  ].join(" ");

  return {
    message,
    activity: {
      type: "agent",
      text: `Planned ${fresh.length} new move${fresh.length === 1 ? "" : "s"} across the workspace.`,
    },
    files: [],
    tasks: fresh,
    claimTaskIds: [],
    completeTaskIds: [],
    runFileId: null,
  };
}

function localBuild(workspace: Workspace): AgentOutcome {
  const task = firstTaskFor(workspace, "nova");
  const title = task?.title ?? `Scaffold a module for ${workspace.name}`;
  const fnName = camelCase(title);
  const desired = `src/${fileStem(title)}.js`;
  const targetPath = uniquePath(workspace, desired);
  const content = `/**
 * ${title}
 * Scaffolded by Nova in Atelier. Replace the thin middle with the real logic.
 */

export function ${fnName}(input) {
  if (input == null) {
    throw new TypeError("${fnName} requires an input");
  }

  return {
    ok: true,
    input,
    note: "scaffold ready for implementation",
  };
}
`;

  return {
    message: [
      `Scaffolded \`${targetPath}\` for **${title}**.`,
      `It exports \`${fnName}\` with a guard and a runnable shape; I left the domain logic deliberately thin so the seam is easy to review.`,
      task ? "The task is now in progress." : "I also added the task to the board.",
    ].join(" "),
    activity: {
      type: "file",
      text: `Scaffolded ${targetPath} from "${title}".`,
    },
    files: [{ path: targetPath, content }],
    tasks: task ? [] : [{ title, agentId: "nova" }],
    claimTaskIds: task ? [task.id] : [],
    completeTaskIds: [],
    runFileId: null,
  };
}

function localReview(workspace: Workspace): AgentOutcome {
  const findings: string[] = [];
  const tasks: AgentOutcome["tasks"] = [];
  const existing = new Set(workspace.tasks.map((t) => t.title.toLowerCase()));

  for (const file of workspace.files) {
    if (file.path.startsWith("docs/") || file.language === "markdown") continue;
    const lines = file.content.split("\n").length;
    if (lines > 300) {
      findings.push(`\`${file.path}\` is ${lines} lines — consider a seam before it grows further.`);
    }
    if (/\bTODO\b|\bFIXME\b/.test(file.content)) {
      const matches = file.content.match(/\bTODO\b|\bFIXME\b/g)?.length ?? 0;
      findings.push(`\`${file.path}\` carries ${matches} unresolved TODO/FIXME marker${matches === 1 ? "" : "s"}.`);
      const taskTitle = `Resolve TODO markers in ${file.path}`;
      if (!existing.has(taskTitle.toLowerCase())) {
        tasks.push({ title: taskTitle, agentId: "nova" });
      }
    }
  }

  const tests = testFiles(workspace);
  if (tests.length === 0) {
    findings.push("No runnable test file is present, so behaviour is only verified by reading.");
    const taskTitle = "Add a runnable behavior test";
    if (!existing.has(taskTitle.toLowerCase())) {
      tasks.push({ title: taskTitle, agentId: "echo" });
    }
  }

  const source = sourceFiles(workspace);
  if (source.length > 0) {
    const noGuard = source.filter(
      (file) =>
        /export function/.test(file.content) &&
        !/throw new (TypeError|RangeError|Error)/.test(file.content),
    );
    if (noGuard.length > 0) {
      findings.push(
        `${noGuard.length} module${noGuard.length === 1 ? "" : "s"} export functions without an explicit guard path.`,
      );
    }
  }

  const linked = source.some((file) =>
    file.content.includes("from \"./") || file.content.includes("from './"),
  );
  if (source.length > 1 && !linked) {
    findings.push("Multiple source modules exist but none import each other — check the intended boundary.");
  }

  const message =
    findings.length === 0
      ? `Review pass over ${workspace.files.length} files. **No blocking findings.** The shape is coherent; I would only ask for one more run of the suite before we call it done.`
      : `Review pass over ${workspace.files.length} files. **${findings.length} finding${findings.length === 1 ? "" : "s"}:**\n\n${findings
          .slice(0, 5)
          .map((finding) => `- ${finding}`)
          .join("\n")}`;

  return {
    message,
    activity: {
      type: "agent",
      text: `Reviewed ${workspace.files.length} files and surfaced ${findings.length} finding${findings.length === 1 ? "" : "s"}.`,
    },
    files: [],
    tasks,
    claimTaskIds: [],
    completeTaskIds: [],
    runFileId: null,
  };
}

function localTest(workspace: Workspace): AgentOutcome {
  const tests = testFiles(workspace);
  const target = tests[0] ?? sourceFiles(workspace)[0];
  if (!target) {
    return {
      message:
        "There is nothing runnable in this space yet. Give me a JavaScript or Python file and I will execute it in the sandbox.",
      activity: { type: "run", text: "Sandbox run skipped — no runnable file." },
      files: [],
      tasks: [],
      claimTaskIds: [],
      completeTaskIds: [],
      runFileId: null,
    };
  }

  return {
    message: `Running \`${target.path}\` in the sandbox…`,
    activity: { type: "run", text: `Started a sandbox run of ${target.path}.` },
    files: [],
    tasks: [],
    claimTaskIds: [],
    completeTaskIds: [],
    runFileId: target.id,
  };
}

function localChat(
  workspace: Workspace,
  agentId: AgentId,
  mention: string,
): AgentOutcome {
  const persona = agent(workspace, agentId);
  const open = openTasks(workspace);
  const source = sourceFiles(workspace);
  const tests = testFiles(workspace);
  const target = source[0];
  const normalized = mention.toLowerCase();

  let body: string;
  if (/\b(test|tests|testing|suite|coverage|run|spec)\b/.test(normalized)) {
    body = tests.length
      ? `I can run ${tests.map((file) => `\`${file.path}\``).join(", ")} in the sandbox. Say the word and I will bring back exit code, timing, and the first failure.`
      : "There is no test file yet. That is the gap I would close first: one runnable behavior check is worth more than a page of notes.";
  } else if (/\b(plan|next|roadmap|move|priority)\b/.test(normalized)) {
    body = open.length
      ? `The board has ${open.length} open move${open.length === 1 ? "" : "s"}. I would start with **${open[0].title}**${open[1] ? `, then **${open[1].title}**` : ""}. Everything else can wait for the next pass.`
      : "The board is clear. I would use the space for one sharp improvement, not five shallow ones.";
  } else if (/\b(review|risk|bug|edge|safe)\b/.test(normalized)) {
    body = target
      ? `The nearest seam is \`${target.path}\`. I would check the guard paths and the boundary between data and presentation before adding anything new.${tests.length ? "" : " There is no test file, so that is also an unhedged risk."}`
      : "Nothing is load-bearing yet, so the risk is mostly ambiguity. Pin one observable outcome for this session.";
  } else {
    body = target
      ? `I have the room. ${workspace.files.length} files, ${open.length} open moves, and \`${target.path}\` as the current seam. Give me a concrete target and I will take a narrow pass.`
      : `I have the room. ${workspace.files.length} files and ${open.length} open moves, but no runnable source yet. Tell me what this space should do and we can start from the smallest observable outcome.`;
  }

  return {
    message: body,
    activity: {
      type: "agent",
      text: `${persona.name} answered a room mention.`,
    },
    files: [],
    tasks: [],
    claimTaskIds: [],
    completeTaskIds: [],
    runFileId: null,
  };
}

interface LlmFile {
  path: string;
  content: string;
}

interface LlmResponse {
  message?: string;
  files?: LlmFile[];
  tasks?: Array<{ title: string; agentId?: string | null; status?: TaskStatus }>;
  claimTaskIds?: string[];
  completeTaskIds?: string[];
}

async function llmOutcome(
  workspace: Workspace,
  agentId: AgentId,
  action: string,
  context: AgentContext,
): Promise<AgentOutcome | null> {
  if (!LLM.enabled) return null;
  const persona = agent(workspace, agentId);
  const files = workspace.files
    .map(
      (file) =>
        `--- ${file.path} ---\n${truncate(file.content, 3_000)}`,
    )
    .join("\n\n")
    .slice(0, 14_000);
  const tasks = workspace.tasks
    .map((task) => `[${task.status}] ${task.id} — ${task.title} (${task.agentId ?? "unassigned"})`)
    .join("\n");
  const recent = workspace.messages
    .slice(-6)
    .map((message) => `${message.authorName}: ${message.text}`)
    .join("\n");

  const prompt = `You are ${persona.name}, the ${persona.role} in a shared code space called Atelier.
${AGENT_INSTRUCTIONS[agentId]}

Session action: ${action}
${context.mention ? `Latest human message: ${context.mention}` : ""}

Workspace: ${workspace.name} — ${workspace.description}
Tasks:
${tasks || "(none)"}

Recent room messages:
${recent || "(none)"}

Files:
${files || "(none)"}

Respond with ONLY a JSON object:
{
  "message": "short markdown message to the room, under 120 words",
  "files": [{"path": "src/example.js", "content": "complete file contents"}],
  "tasks": [{"title": "task title", "agentId": "atlas|nova|sage|echo|null"}],
  "claimTaskIds": ["existing task ids to move to in_progress"],
  "completeTaskIds": ["existing task ids to mark done"]
}

Rules:
- Only include files you are confident should be written. Use full file contents, not patches.
- For review or chat, files is usually empty.
- Do not invent secrets, URLs, or dependencies. Prefer the Node standard library.
- Keep the session moving with one or two concrete moves.`;

  try {
    const response = await fetch(`${LLM.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${LLM.apiKey}`,
      },
      body: JSON.stringify({
        model: LLM.model,
        temperature: 0.4,
        max_tokens: 1_200,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content ?? "";
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    const parsed = JSON.parse(raw.slice(start, end + 1)) as LlmResponse;
    if (!parsed.message || typeof parsed.message !== "string") return null;

    const agentIds = new Set<AgentId>(["atlas", "nova", "sage", "echo"]);
    const taskIds = new Set(workspace.tasks.map((task) => task.id));
    return {
      message: parsed.message,
      activity: {
        type: action === "review" ? "agent" : "file",
        text: `${persona.name} completed a model-assisted ${action} pass.`,
      },
      files: (parsed.files ?? [])
        .filter((file) => typeof file?.path === "string" && typeof file?.content === "string")
        .slice(0, 3),
      tasks: (parsed.tasks ?? [])
        .filter((task) => typeof task?.title === "string" && task.title.trim())
        .map((task) => ({
          title: task.title.trim().slice(0, 160),
          agentId: agentIds.has(task.agentId as AgentId)
            ? (task.agentId as AgentId)
            : null,
        }))
        .slice(0, 5),
      claimTaskIds: (parsed.claimTaskIds ?? []).filter((id) => taskIds.has(id)),
      completeTaskIds: (parsed.completeTaskIds ?? []).filter((id) => taskIds.has(id)),
      runFileId: null,
    };
  } catch (error) {
    console.warn(`[atelier] model-assisted ${agentId} pass failed:`, (error as Error).message);
    return null;
  }
}

export async function executeAgentAction(
  workspace: Workspace,
  agentId: AgentId,
  action: string,
  context: AgentContext = {},
): Promise<AgentOutcome> {
  agent(workspace, agentId);

  if (action === "test") return localTest(workspace);
  if (LLM.enabled) {
    const outcome = await llmOutcome(workspace, agentId, action, context);
    if (outcome) return outcome;
  }

  switch (action) {
    case "plan":
      return localPlan(workspace);
    case "build":
      return localBuild(workspace);
    case "review":
      return localReview(workspace);
    case "chat":
      return localChat(workspace, agentId, context.mention ?? "");
    default:
      throw new Error(`Unknown agent action: ${action}`);
  }
}
