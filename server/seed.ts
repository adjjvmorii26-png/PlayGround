import type {
  Activity,
  Agent,
  ChatMessage,
  Task,
  Workspace,
  WorkspaceFile,
} from "../shared/types.js";
import { id, languageFromPath, now } from "./lib.js";

export const AGENT_DEFINITIONS: Agent[] = [
  {
    id: "atlas",
    name: "Atlas",
    role: "Architect",
    tagline: "Finds the shape of the system before the first line lands.",
    color: "#b9a7ff",
    status: "online",
  },
  {
    id: "nova",
    name: "Nova",
    role: "Builder",
    tagline: "Turns a clear intent into working, reviewable code.",
    color: "#ffd166",
    status: "idle",
  },
  {
    id: "sage",
    name: "Sage",
    role: "Reviewer",
    tagline: "Looks for the sharp edges everyone else walked past.",
    color: "#74e6c4",
    status: "online",
  },
  {
    id: "echo",
    name: "Echo",
    role: "Runner",
    tagline: "Proves the workspace actually works in the sandbox.",
    color: "#ff9ec7",
    status: "idle",
  },
];

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function file(
  seedId: string,
  path: string,
  content: string,
  updatedBy = "nova",
  minutes = 12,
): WorkspaceFile {
  return {
    id: seedId,
    path,
    language: languageFromPath(path),
    content,
    updatedAt: minutesAgo(minutes),
    updatedBy,
  };
}

const ORBIT_JS = `export const EARTH_RADIUS_KM = 6371;
export const MU_EARTH = 398600.4418;

/**
 * Circular orbital speed at a given altitude.
 * @param {number} altitudeKm
 * @returns {number} speed in km/s
 */
export function orbitalVelocity(altitudeKm) {
  assertAltitude(altitudeKm);
  return Math.sqrt(MU_EARTH / (EARTH_RADIUS_KM + altitudeKm));
}

/**
 * Plan a two-burn Hohmann transfer between circular orbits.
 * @param {number} fromKm parking altitude
 * @param {number} toKm target altitude
 */
export function hohmannTransfer(fromKm, toKm) {
  assertAltitude(fromKm);
  assertAltitude(toKm);
  if (fromKm === toKm) {
    throw new RangeError("Orbits are already matched");
  }

  const r1 = EARTH_RADIUS_KM + fromKm;
  const r2 = EARTH_RADIUS_KM + toKm;
  const a = (r1 + r2) / 2;
  const v1 = Math.sqrt(MU_EARTH / r1);
  const v2 = Math.sqrt(MU_EARTH / r2);
  const vPerigee = Math.sqrt(MU_EARTH * (2 / r1 - 1 / a));
  const vApogee = Math.sqrt(MU_EARTH * (2 / r2 - 1 / a));

  const deltaV1 = vPerigee - v1;
  const deltaV2 = v2 - vApogee;

  return {
    deltaV1,
    deltaV2,
    totalDeltaV: Math.abs(deltaV1) + Math.abs(deltaV2),
    transferSeconds: Math.PI * Math.sqrt(a ** 3 / MU_EARTH),
  };
}

export function formatVelocity(kmPerSecond) {
  return \`\${kmPerSecond.toFixed(4)} km/s\`;
}

export function formatDuration(seconds) {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return \`\${minutes}m \${String(rest).padStart(2, "0")}s\`;
}

function assertAltitude(altitudeKm) {
  if (!Number.isFinite(altitudeKm) || altitudeKm < 0) {
    throw new RangeError("altitude must be a non-negative number");
  }
}
`;

const MAIN_JS = `import {
  hohmannTransfer,
  orbitalVelocity,
  formatDuration,
  formatVelocity,
} from "./orbit.js";

const mission = { name: "Aster-9", fromKm: 412, toKm: 780 };
const burn = hohmannTransfer(mission.fromKm, mission.toKm);
const rule = "─".repeat(48);

console.log("");
console.log(\`  \${mission.name} // orbit insertion\`);
console.log(\`  \${rule}\`);
console.log(
  \`  parking    \${String(mission.fromKm).padStart(5)} km  \${formatVelocity(orbitalVelocity(mission.fromKm))}\`,
);
console.log(
  \`  target     \${String(mission.toKm).padStart(5)} km  \${formatVelocity(orbitalVelocity(mission.toKm))}\`,
);
console.log(\`  \${rule}\`);
console.log(\`  burn 1     \${formatVelocity(burn.deltaV1).padStart(12)}\`);
console.log(\`  coast      \${formatDuration(burn.transferSeconds).padStart(12)}\`);
console.log(\`  burn 2     \${formatVelocity(burn.deltaV2).padStart(12)}\`);
console.log(\`  total Δv   \${formatVelocity(burn.totalDeltaV).padStart(12)}\`);
console.log(\`  \${rule}\`);
console.log("  window open. awaiting range confirmation.");
`;

const ORBIT_TEST = `import test from "node:test";
import assert from "node:assert/strict";
import {
  EARTH_RADIUS_KM,
  hohmannTransfer,
  orbitalVelocity,
} from "../src/orbit.js";

test("orbital velocity falls as altitude rises", () => {
  assert.ok(orbitalVelocity(200) > orbitalVelocity(2000));
});

test("a Hohmann transfer is symmetric when reversed", () => {
  const up = hohmannTransfer(412, 780);
  const down = hohmannTransfer(780, 412);
  assert.ok(up.totalDeltaV > 0);
  assert.ok(Math.abs(up.totalDeltaV - down.totalDeltaV) < 1e-9);
});

test("altitude guards reject nonsense", () => {
  assert.throws(() => orbitalVelocity(-1), RangeError);
  assert.throws(() => hohmannTransfer(412, 412), RangeError);
});

test("LEO speed matches the textbook range", () => {
  const speed = orbitalVelocity(400);
  assert.ok(speed > 7.6 && speed < 7.7);
});
`;

const WORKSPACE_README = `# Orbital Lab

A small mission-planning toolkit, built together in **Atelier**.

\`\`\`
src/orbit.js       orbital mechanics primitives
src/main.js        printable transfer plan
tests/orbit.test.js node:test regression suite
docs/decisions.md  why the shape is the shape
\`\`\`

## Run

Select \`src/main.js\` in the file tree and press **Run**. The sandbox gets a
throwaway copy of the tree, a hard time limit, and capped output.

## Test

Select \`tests/orbit.test.js\` and run it. Node's built-in test runner does the rest.

## Next

The board has the open moves. Ask Nova to scaffold one, then have Sage review the
seam before Echo proves it in the sandbox.
`;

const DECISIONS = `# Decision log

## 001 — Physics stays pure

\`src/orbit.js\` has no I/O. It accepts numbers and returns numbers. That makes the
module cheap to test and safe to reuse from a CLI, an API, or a future UI.

## 002 — The console is the first interface

\`src/main.js\` renders a transfer plan for humans. No framework, no build step.
The sandbox runs it directly, which keeps the feedback loop short.

## 003 — Tests use the platform

Node's built-in \`node:test\` runner needs no dependency tree. The suite runs in
the same sandbox as the app, so what we verify is what we ship.

## Open question

Should the burn timeline become a library boundary, or is the printable table
enough for this session? Atlas is watching for a second consumer.
`;

function seedFiles(): WorkspaceFile[] {
  return [
    file("file_readme", "README.md", WORKSPACE_README, "atlas", 34),
    file("file_orbit", "src/orbit.js", ORBIT_JS, "nova", 11),
    file("file_main", "src/main.js", MAIN_JS, "nova", 9),
    file("file_test", "tests/orbit.test.js", ORBIT_TEST, "echo", 7),
    file("file_decisions", "docs/decisions.md", DECISIONS, "sage", 22),
  ];
}

function seedMessages(): ChatMessage[] {
  return [
    {
      id: "msg_1",
      authorId: "mira",
      authorName: "Mira Chen",
      authorKind: "human",
      text: "Bringing Aster-9 online. Atlas, sketch the plan — keep the first pass small enough to run today.",
      createdAt: minutesAgo(41),
    },
    {
      id: "msg_2",
      authorId: "atlas",
      authorName: "Atlas",
      authorKind: "agent",
      agentId: "atlas",
      text: "Three moves: model the transfer, pressure-test the edges, then make the output legible to a human. The first two are on the board; Nova owns the implementation seam.",
      createdAt: minutesAgo(38),
    },
    {
      id: "msg_3",
      authorId: "nova",
      authorName: "Nova",
      authorKind: "agent",
      agentId: "nova",
      text: "Hohmann model is in src/orbit.js. Run src/main.js — the parking burn is 0.20 km/s and the coast is 48m 14s.",
      createdAt: minutesAgo(14),
    },
    {
      id: "msg_4",
      authorId: "sage",
      authorName: "Sage",
      authorKind: "agent",
      agentId: "sage",
      text: "Read the module. The altitude guard is solid; I would still pin LEO velocity to a range so a unit change cannot slip through unnoticed.",
      createdAt: minutesAgo(6),
    },
  ];
}

function seedTasks(): Task[] {
  return [
    {
      id: "task_model",
      title: "Model a Hohmann transfer between circular orbits",
      status: "done",
      agentId: "nova",
      createdAt: minutesAgo(37),
      updatedAt: minutesAgo(14),
    },
    {
      id: "task_timeline",
      title: "Render the burn timeline in the console",
      status: "in_progress",
      agentId: "nova",
      createdAt: minutesAgo(36),
      updatedAt: minutesAgo(9),
    },
    {
      id: "task_edges",
      title: "Cover invalid altitudes in the sandbox",
      status: "todo",
      agentId: "echo",
      createdAt: minutesAgo(35),
      updatedAt: minutesAgo(35),
    },
    {
      id: "task_review",
      title: "Review the module boundary before the next consumer",
      status: "todo",
      agentId: "sage",
      createdAt: minutesAgo(31),
      updatedAt: minutesAgo(31),
    },
  ];
}

function seedActivity(): Activity[] {
  return [
    {
      id: "act_1",
      type: "system",
      actorId: "system",
      actorName: "Atelier",
      actorKind: "system",
      text: "Workspace orbital-lab booted in a Node 22 sandbox.",
      createdAt: minutesAgo(42),
    },
    {
      id: "act_2",
      type: "task",
      actorId: "atlas",
      actorName: "Atlas",
      actorKind: "agent",
      text: "Split the session into 4 tracked moves.",
      createdAt: minutesAgo(38),
    },
    {
      id: "act_3",
      type: "file",
      actorId: "nova",
      actorName: "Nova",
      actorKind: "agent",
      text: "Published src/orbit.js and src/main.js.",
      createdAt: minutesAgo(14),
    },
    {
      id: "act_4",
      type: "file",
      actorId: "sage",
      actorName: "Sage",
      actorKind: "agent",
      text: "Annotated tests/orbit.test.js with a velocity range check.",
      createdAt: minutesAgo(5),
    },
  ];
}

export function createSeedWorkspace(): Workspace {
  return {
    id: "orbital-lab",
    name: "Orbital Lab",
    description: "Mission planning tools for the Aster-9 transfer window.",
    createdAt: minutesAgo(60),
    updatedAt: minutesAgo(3),
    revision: 1,
    files: seedFiles(),
    messages: seedMessages(),
    tasks: seedTasks(),
    activity: seedActivity(),
    agents: structuredClone(AGENT_DEFINITIONS),
    settings: {
      runtime: "node",
      sandbox: "local",
      memoryMb: 256,
      timeoutMs: 6000,
    },
    lastRun: null,
  };
}

export function createBlankWorkspace(name: string): Workspace {
  const timestamp = now();
  const workspaceId = id("ws");
  const readme = `# ${name}

A fresh Atelier space. Everything here is shared by the humans and agents in the
room.

## Start here

1. Edit \`src/main.js\`.
2. Press **Run** to execute it in the sandbox.
3. Ask Atlas for a plan, or Nova to scaffold the next file.
`;
  const main = `const session = {
  space: ${JSON.stringify(name)},
  runtime: "node 22",
  isolation: "ephemeral",
};

console.log("hello from " + session.space);
console.log("runtime:", session.runtime);
console.log("isolation:", session.isolation);
`;

  return {
    id: workspaceId,
    name,
    description: "A new shared space for humans and agents.",
    createdAt: timestamp,
    updatedAt: timestamp,
    revision: 1,
    files: [
      {
        id: id("file"),
        path: "README.md",
        language: "markdown",
        content: readme,
        updatedAt: timestamp,
        updatedBy: "atlas",
      },
      {
        id: id("file"),
        path: "src/main.js",
        language: "javascript",
        content: main,
        updatedAt: timestamp,
        updatedBy: "nova",
      },
    ],
    messages: [
      {
        id: id("msg"),
        authorId: "atlas",
        authorName: "Atlas",
        authorKind: "agent",
        agentId: "atlas",
        text: "Space is live. I am reading the room — add a file or tell me what we are building, and I will turn it into tracked moves.",
        createdAt: timestamp,
      },
    ],
    tasks: [],
    activity: [
      {
        id: id("act"),
        type: "system",
        actorId: "system",
        actorName: "Atelier",
        actorKind: "system",
        text: `Workspace ${name} created.`,
        createdAt: timestamp,
      },
    ],
    agents: structuredClone(AGENT_DEFINITIONS),
    settings: {
      runtime: "node",
      sandbox: "local",
      memoryMb: 256,
      timeoutMs: 6000,
    },
    lastRun: null,
  };
}
