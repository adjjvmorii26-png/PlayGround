import type {
  AgentAction,
  AgentId,
  Health,
  RunResult,
  TaskStatus,
  Workspace,
  WorkspaceSummary,
} from "@shared/types";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = (await response.json()) as { error?: string; details?: string };
      if (payload.error) {
        message = payload.details ? `${payload.error}: ${payload.details}` : payload.error;
      }
    } catch {
      // keep the status message
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export const api = {
  health: () => request<Health>("/api/health"),

  listWorkspaces: () => request<WorkspaceSummary[]>("/api/workspaces"),

  getWorkspace: (workspaceId: string) =>
    request<Workspace>(`/api/workspaces/${workspaceId}`),

  createWorkspace: (name: string) =>
    request<Workspace>("/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  createFile: (
    workspaceId: string,
    file: { path: string; content?: string; authorName: string },
  ) =>
    request<Workspace>(`/api/workspaces/${workspaceId}/files`, {
      method: "POST",
      body: JSON.stringify(file),
    }),

  updateFile: (
    workspaceId: string,
    fileId: string,
    patch: { path?: string; content?: string; authorName: string },
  ) =>
    request<Workspace>(`/api/workspaces/${workspaceId}/files/${fileId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  deleteFile: (workspaceId: string, fileId: string, authorName: string) =>
    request<Workspace>(
      `/api/workspaces/${workspaceId}/files/${fileId}?authorName=${encodeURIComponent(authorName)}`,
      { method: "DELETE" },
    ),

  runFile: (workspaceId: string, fileId: string, authorName: string) =>
    request<{ run: RunResult; workspace: Workspace }>(
      `/api/workspaces/${workspaceId}/run`,
      {
        method: "POST",
        body: JSON.stringify({ fileId, authorName }),
      },
    ),

  sendMessage: (
    workspaceId: string,
    message: { text: string; authorName: string; authorId: string },
  ) =>
    request<Workspace>(`/api/workspaces/${workspaceId}/messages`, {
      method: "POST",
      body: JSON.stringify(message),
    }),

  agentAction: (
    workspaceId: string,
    agentId: AgentId,
    action: AgentAction,
    mention?: string,
  ) =>
    request<{ workspace: Workspace }>(
      `/api/workspaces/${workspaceId}/agents/${agentId}/actions`,
      {
        method: "POST",
        body: JSON.stringify({ action, mention }),
      },
    ),

  createTask: (
    workspaceId: string,
    task: { title: string; agentId?: AgentId | null },
  ) =>
    request<Workspace>(`/api/workspaces/${workspaceId}/tasks`, {
      method: "POST",
      body: JSON.stringify(task),
    }),

  updateTask: (workspaceId: string, taskId: string, status: TaskStatus) =>
    request<Workspace>(`/api/workspaces/${workspaceId}/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
