const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function timeAgo(value: string): string {
  const delta = Date.now() - new Date(value).getTime();
  const seconds = Math.round(delta / 1000);
  if (Math.abs(seconds) < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return RELATIVE.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return RELATIVE.format(-hours, "hour");
  const days = Math.round(hours / 24);
  return RELATIVE.format(-days, "day");
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function baseName(filePath: string): string {
  return filePath.split("/").pop() ?? filePath;
}

export function dirName(filePath: string): string {
  const parts = filePath.split("/");
  parts.pop();
  return parts.join("/");
}

export function languageLabel(language: string): string {
  switch (language) {
    case "javascript":
      return "JavaScript";
    case "typescript":
      return "TypeScript";
    case "python":
      return "Python";
    case "markdown":
      return "Markdown";
    case "json":
      return "JSON";
    case "css":
      return "CSS";
    case "html":
      return "HTML";
    default:
      return "Text";
  }
}

export function languageColor(language: string): string {
  switch (language) {
    case "javascript":
      return "#f2d16b";
    case "typescript":
      return "#7cc7ff";
    case "python":
      return "#77c7ff";
    case "markdown":
      return "#b9a7ff";
    case "json":
      return "#d7f75b";
    case "css":
      return "#ff9ec7";
    case "html":
      return "#ffb86b";
    default:
      return "#8b919e";
  }
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function friendlyStatus(status: string): string {
  if (status === "in_progress") return "in progress";
  return status;
}

const PALETTE = ["#d7f75b", "#8b7cff", "#ffb86b", "#6ee7c8", "#ff9ec7", "#7cc7ff"];

export function colorFor(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
