import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { RunResult, Workspace, WorkspaceFile } from "../shared/types.js";
import { HttpError, colorFromString, id, now, sanitizePath, stripAnsi } from "./lib.js";

const OUTPUT_LIMIT = 32_000;

interface RunnerOptions {
  mode: "local" | "docker";
  timeoutMs: number;
  memoryMb: number;
}

function capOutput(current: string, chunk: string): string {
  if (current.length >= OUTPUT_LIMIT) return current;
  const next = current + chunk;
  if (next.length <= OUTPUT_LIMIT) return next;
  return `${next.slice(0, OUTPUT_LIMIT)}\n… output truncated`;
}

function commandFor(
  file: WorkspaceFile,
  options: RunnerOptions,
  workspaceDir: string,
): { command: string; args: string[] } {
  const relative = sanitizePath(file.path);
  const memoryFlag = `--max-old-space-size=${options.memoryMb}`;

  if (file.language === "javascript" || file.language === "typescript") {
    if (options.mode === "docker") {
      return {
        command: "docker",
        args: [
          "run",
          "--rm",
          "--network",
          "none",
          "--memory",
          `${options.memoryMb}m`,
          "--memory-swap",
          `${options.memoryMb}m`,
          "--cpus",
          "0.5",
          "--pids-limit",
          "64",
          "--read-only",
          "--tmpfs",
          "/tmp:rw,nosuid,size=16m",
          "-v",
          `${workspaceDir}:/workspace:ro`,
          "-w",
          "/workspace",
          "-e",
          "HOME=/tmp",
          "node:22-alpine",
          "node",
          memoryFlag,
          relative,
        ],
      };
    }
    return {
      command: process.execPath,
      args: [memoryFlag, relative],
    };
  }

  if (file.language === "python") {
    if (options.mode === "docker") {
      return {
        command: "docker",
        args: [
          "run",
          "--rm",
          "--network",
          "none",
          "--memory",
          `${options.memoryMb}m`,
          "--memory-swap",
          `${options.memoryMb}m`,
          "--cpus",
          "0.5",
          "--pids-limit",
          "64",
          "--read-only",
          "--tmpfs",
          "/tmp:rw,nosuid,size=16m",
          "-v",
          `${workspaceDir}:/workspace:ro`,
          "-w",
          "/workspace",
          "-e",
          "HOME=/tmp",
          "python:3.12-alpine",
          "python3",
          relative,
        ],
      };
    }
    return {
      command: "python3",
      args: ["-I", "-B", relative],
    };
  }

  throw new HttpError(400, "Select a JavaScript, TypeScript, or Python file to run");
}

export async function runWorkspaceFile(
  workspace: Workspace,
  fileId: string,
  overrides: Partial<RunnerOptions> = {},
): Promise<RunResult> {
  const file = workspace.files.find((entry) => entry.id === fileId);
  if (!file) throw new HttpError(404, "File not found");

  const options: RunnerOptions = {
    mode: overrides.mode ?? workspace.settings.sandbox,
    timeoutMs: overrides.timeoutMs ?? workspace.settings.timeoutMs,
    memoryMb: overrides.memoryMb ?? workspace.settings.memoryMb,
  };

  const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "atelier-"));
  const started = Date.now();

  try {
    for (const entry of workspace.files) {
      const relative = sanitizePath(entry.path);
      const target = path.join(workspaceDir, relative);
      if (!target.startsWith(workspaceDir + path.sep)) {
        throw new HttpError(400, "Refusing to write outside the sandbox");
      }
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, entry.content, "utf8");
    }

    const { command, args } = commandFor(file, options, workspaceDir);
    const result = await execute(command, args, workspaceDir, options);

    return {
      id: id("run"),
      status: result.timedOut ? "timeout" : result.exitCode === 0 ? "success" : "error",
      runtime: file.language === "python" ? "python" : "node",
      exitCode: result.timedOut ? null : result.exitCode,
      stdout: stripAnsi(result.stdout).trimEnd(),
      stderr: stripAnsi(result.stderr).trimEnd(),
      durationMs: Date.now() - started,
      filePath: file.path,
      finishedAt: now(),
    };
  } finally {
    await fs.rm(workspaceDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

interface ExecOutcome {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

function execute(
  command: string,
  args: string[],
  cwd: string,
  options: RunnerOptions,
): Promise<ExecOutcome> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      detached: process.platform !== "win32",
      env: {
        PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
        HOME: os.tmpdir(),
        TMPDIR: os.tmpdir(),
        NODE_ENV: "production",
        ATELIER_RUN_COLOR: colorFromString(options.mode),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    child.stdout.on("data", (chunk: Buffer) => {
      stdout = capOutput(stdout, chunk.toString("utf8"));
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = capOutput(stderr, chunk.toString("utf8"));
    });

    const killTree = () => {
      if (!child.pid) return;
      try {
        if (process.platform === "win32") child.kill("SIGKILL");
        else process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    };

    const timer = setTimeout(() => {
      timedOut = true;
      killTree();
    }, options.timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      reject(
        new HttpError(
          500,
          `Sandbox could not start: ${error.message}. Docker mode requires a local image.`,
        ),
      );
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      resolve({ exitCode: code, stdout, stderr, timedOut });
    });
  });
}
