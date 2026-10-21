import path from "node:path";

export const VERSION = "0.1.0";
export const PORT = Number(process.env.PORT ?? 3001);

export const DATA_FILE =
  process.env.ATELIER_DATA_FILE ??
  path.resolve(process.cwd(), "data", "workspaces.json");

export const REDIS_URL = process.env.REDIS_URL?.trim() || null;

export const SANDBOX_MODE =
  process.env.SANDBOX_MODE === "docker" ? "docker" : "local";

export const RUN_TIMEOUT_MS = clamp(
  Number(process.env.SANDBOX_TIMEOUT_MS ?? 6000),
  1000,
  30000,
);

export const SANDBOX_MEMORY_MB = clamp(
  Number(process.env.SANDBOX_MEMORY_MB ?? 256),
  64,
  1024,
);

export const MAX_FILE_BYTES = 200_000;
export const MAX_MESSAGE_CHARS = 4_000;

export const LLM = {
  apiKey: process.env.OPENAI_API_KEY?.trim() || "",
  baseUrl: (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, ""),
  model: process.env.ATELIER_MODEL ?? "gpt-4o-mini",
  enabled: Boolean(process.env.OPENAI_API_KEY?.trim()),
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
