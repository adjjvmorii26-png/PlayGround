export type AgentId = "atlas" | "nova" | "sage" | "echo";

export type AgentStatus = "online" | "idle" | "thinking";

export type AgentAction = "plan" | "build" | "review" | "test" | "chat";

export type Runtime = "node" | "python";

export type SandboxMode = "local" | "docker";

export type FileLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "markdown"
  | "json"
  | "css"
  | "html"
  | "text";

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  tagline: string;
  color: string;
  status: AgentStatus;
}

export interface WorkspaceFile {
  id: string;
  path: string;
  language: FileLanguage;
  content: string;
  updatedAt: string;
  updatedBy: string;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorKind: "human" | "agent";
  agentId?: AgentId;
  text: string;
  createdAt: string;
}

export type TaskStatus = "todo" | "in_progress" | "done";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  agentId: AgentId | null;
  createdAt: string;
  updatedAt: string;
}

export type ActivityType = "file" | "run" | "agent" | "task" | "system";

export interface Activity {
  id: string;
  type: ActivityType;
  actorId: string;
  actorName: string;
  actorKind: "human" | "agent" | "system";
  text: string;
  createdAt: string;
}

export interface RunResult {
  id: string;
  status: "success" | "error" | "timeout";
  runtime: Runtime;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  filePath: string;
  finishedAt: string;
}

export interface WorkspaceSettings {
  runtime: Runtime;
  sandbox: SandboxMode;
  memoryMb: number;
  timeoutMs: number;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  files: WorkspaceFile[];
  messages: ChatMessage[];
  tasks: Task[];
  activity: Activity[];
  agents: Agent[];
  settings: WorkspaceSettings;
  lastRun: RunResult | null;
}

export interface Presence {
  socketId: string;
  userId: string;
  name: string;
  kind: "human" | "agent";
  color: string;
  status: AgentStatus;
  agentId?: AgentId;
  fileId?: string;
}

export interface Health {
  ok: boolean;
  version: string;
  storage: "file" | "redis";
  realtime: "memory" | "redis";
  sandbox: SandboxMode;
  llm: boolean;
  uptimeSeconds: number;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  fileCount: number;
  taskCount: number;
  openTasks: number;
  agentsOnline: number;
}

export interface ApiError {
  error: string;
  details?: string;
}
