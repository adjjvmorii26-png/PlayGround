import { randomUUID } from "node:crypto";
import type { FileLanguage } from "../shared/types.js";

export function id(prefix = ""): string {
  const value = randomUUID();
  return prefix ? `${prefix}_${value.slice(0, 8)}` : value;
}

export function now(): string {
  return new Date().toISOString();
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "untitled";
}

const LANGUAGE_BY_EXTENSION: Record<string, FileLanguage> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  md: "markdown",
  json: "json",
  css: "css",
  html: "html",
  txt: "text",
};

const ALLOWED_EXTENSIONS = new Set(Object.keys(LANGUAGE_BY_EXTENSION));

export function languageFromPath(filePath: string): FileLanguage {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return LANGUAGE_BY_EXTENSION[ext] ?? "text";
}

export function sanitizePath(input: string): string {
  const cleaned = input.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!cleaned || cleaned.length > 140) {
    throw new HttpError(400, "Invalid file path");
  }
  const parts = cleaned.split("/").filter(Boolean);
  if (
    parts.length === 0 ||
    parts.some((part) => part === "." || part === ".." || part.startsWith("."))
  ) {
    throw new HttpError(400, "Invalid file path");
  }
  const ext = cleaned.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new HttpError(
      400,
      "Unsupported file type. Use .js, .ts, .py, .md, .json, .css, .html, or .txt",
    );
  }
  return parts.join("/");
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}\n… truncated ${value.length - max} chars`;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function stripAnsi(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

export function colorFromString(value: string): string {
  const palette = ["#d7f75b", "#8b7cff", "#ffb86b", "#6ee7c8", "#ff9ec7", "#7cc7ff"];
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}
