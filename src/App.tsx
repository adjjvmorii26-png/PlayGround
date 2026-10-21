import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle, RotateCcw } from "lucide-react";
import type {
  AgentId,
  AgentStatus,
  Health,
  Presence,
  Task,
  Workspace,
  WorkspaceSummary,
} from "@shared/types";
import type { Socket } from "socket.io-client";
import { api } from "@/lib/api";
import { createSocket } from "@/lib/socket";
import { loadUser, saveUser, type LocalUser } from "@/lib/user";
import type { ModalKind, RoomTab, SaveState, ToastMessage } from "@/lib/ui";
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";
import { Workbench } from "@/components/Workbench";
import { RoomPanel } from "@/components/RoomPanel";
import { Modals } from "@/components/Modals";

const AGENT_PRIMARY: Record<AgentId, "plan" | "build" | "review" | "test"> = {
  atlas: "plan",
  nova: "build",
  sage: "review",
  echo: "test",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function summarize(workspace: Workspace): WorkspaceSummary {
  return {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    updatedAt: workspace.updatedAt,
    fileCount: workspace.files.length,
    taskCount: workspace.tasks.length,
    openTasks: workspace.tasks.filter((task) => task.status !== "done").length,
    agentsOnline: workspace.agents.filter((agent) => agent.status !== "idle").length,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isMobileRoom(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 1020px)").matches;
}

export default function App() {
  const [user, setUser] = useState<LocalUser>(() => loadUser());
  const [health, setHealth] = useState<Health | null>(null);
  const [summaries, setSummaries] = useState<WorkspaceSummary[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [activeFileId, setActiveFileId] = useState("");
  const [presence, setPresence] = useState<Presence[]>([]);
  const [typingAgents, setTypingAgents] = useState<Record<string, AgentStatus>>({});
  const [connected, setConnected] = useState(false);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [running, setRunning] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [roomTab, setRoomTab] = useState<RoomTab>("room");
  const [roomOpen, setRoomOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const workspaceRef = useRef<Workspace | null>(null);
  const userRef = useRef(user);
  const activeFileRef = useRef(activeFileId);
  const runningRef = useRef(running);
  const pendingRef = useRef(new Map<string, string>());
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    activeFileRef.current = activeFileId;
  }, [activeFileId]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  const pushToast = useCallback((message: string, tone: ToastMessage["tone"] = "info") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const next = { id: Date.now(), message, tone };
    setToast(next);
    toastTimerRef.current = setTimeout(() => {
      setToast((current) => (current?.id === next.id ? null : current));
    }, 4_200);
  }, []);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  const applyWorkspace = useCallback((incoming: Workspace) => {
    const pending = pendingRef.current;
    let next = incoming;
    if (pending.size > 0) {
      next = {
        ...incoming,
        files: incoming.files.map((file) =>
          pending.has(file.id)
            ? { ...file, content: pending.get(file.id) ?? file.content }
            : file,
        ),
      };
    }
    workspaceRef.current = next;
    setWorkspace(next);
    setSummaries((current) =>
      current.map((summary) => (summary.id === next.id ? summarize(next) : summary)),
    );
  }, []);

  const bootstrap = useCallback(async () => {
    setBooting(true);
    setBootError(null);
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const [nextHealth, list] = await Promise.all([api.health(), api.listWorkspaces()]);
        const requested = new URLSearchParams(window.location.search).get("space");
        const chosen =
          list.find((entry) => entry.id === requested)?.id ?? list[0]?.id ?? null;
        if (!chosen) throw new Error("No workspaces are available");
        const loaded = await api.getWorkspace(chosen);
        workspaceRef.current = loaded;
        setHealth(nextHealth);
        setSummaries(list);
        setWorkspace(loaded);
        setActiveFileId(
          loaded.files.find((file) => file.path === "src/main.js")?.id ??
            loaded.files[0]?.id ??
            "",
        );
        setBooting(false);
        return;
      } catch (error) {
        if (attempt === 5) {
          setBootError(errorMessage(error));
          setBooting(false);
          return;
        }
        await sleep(600);
      }
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setSaveState((current) => (current === "offline" ? "saved" : current));
    });
    socket.on("disconnect", () => {
      setConnected(false);
      setSaveState("offline");
    });
    socket.on("workspace:updated", (incoming: Workspace) => {
      applyWorkspace(incoming);
    });
    socket.on("presence:update", (people: Presence[]) => {
      setPresence(people);
    });
    socket.on(
      "file:updated",
      (payload: {
        fileId: string;
        content: string;
        updatedBy: string;
        updatedAt: string;
      }) => {
        const current = workspaceRef.current;
        if (!current) return;
        if (pendingRef.current.has(payload.fileId)) return;
        const next: Workspace = {
          ...current,
          files: current.files.map((file) =>
            file.id === payload.fileId
              ? {
                  ...file,
                  content: payload.content,
                  updatedBy: payload.updatedBy,
                  updatedAt: payload.updatedAt,
                }
              : file,
          ),
        };
        workspaceRef.current = next;
        setWorkspace(next);
      },
    );
    socket.on(
      "agent:typing",
      (payload: { agentId: AgentId; status: AgentStatus }) => {
        setTypingAgents((current) => {
          const next = { ...current };
          if (payload.status === "thinking") next[payload.agentId] = "thinking";
          else delete next[payload.agentId];
          return next;
        });
      },
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [applyWorkspace]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !workspace) return;
    const join = () => {
      socket.emit("workspace:join", {
        workspaceId: workspace.id,
        user: { id: user.id, name: user.name },
        fileId: activeFileRef.current,
      });
    };
    if (socket.connected) join();
    socket.on("connect", join);
    return () => {
      socket.off("connect", join);
    };
  }, [workspace?.id, user.id, user.name]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !workspace) return;
    const sendCursor = () => {
      if (!activeFileRef.current) return;
      socket.emit("file:cursor", {
        workspaceId: workspace.id,
        fileId: activeFileRef.current,
      });
    };
    sendCursor();
    socket.on("connect", sendCursor);
    return () => {
      socket.off("connect", sendCursor);
    };
  }, [workspace?.id, activeFileId]);

  useEffect(() => {
    if (!workspace) return;
    const url = new URL(window.location.href);
    url.searchParams.set("space", workspace.id);
    window.history.replaceState({}, "", url);
  }, [workspace?.id]);

  useEffect(() => {
    if (!workspace) return;
    if (!workspace.files.some((file) => file.id === activeFileId)) {
      setActiveFileId(workspace.files[0]?.id ?? "");
    }
  }, [workspace, activeFileId]);

  const flushFile = useCallback(
    async (fileId: string) => {
      const content = pendingRef.current.get(fileId);
      if (content === undefined) return;
      pendingRef.current.delete(fileId);
      const timer = timersRef.current.get(fileId);
      if (timer) clearTimeout(timer);
      timersRef.current.delete(fileId);

      const current = workspaceRef.current;
      if (!current) return;

      try {
        let acknowledged = false;
        const socket = socketRef.current;
        if (socket?.connected) {
          const ack = await new Promise<{ ok?: boolean; error?: string } | null>(
            (resolve) => {
              let settled = false;
              const timeout = setTimeout(() => {
                if (!settled) {
                  settled = true;
                  resolve(null);
                }
              }, 2_500);
              socket.emit(
                "file:change",
                {
                  workspaceId: current.id,
                  fileId,
                  content,
                  userName: userRef.current.name,
                },
                (response: { ok?: boolean; error?: string }) => {
                  if (settled) return;
                  settled = true;
                  clearTimeout(timeout);
                  resolve(response);
                },
              );
            },
          );
          acknowledged = Boolean(ack?.ok);
        }
        if (!acknowledged) {
          await api.updateFile(current.id, fileId, {
            content,
            authorName: userRef.current.name,
          });
        }
        setWorkspace((state) =>
          state
            ? {
                ...state,
                files: state.files.map((file) =>
                  file.id === fileId
                    ? { ...file, updatedAt: new Date().toISOString(), updatedBy: userRef.current.name }
                    : file,
                ),
              }
            : state,
        );
        setSaveState("saved");
      } catch (error) {
        setSaveState("offline");
        pushToast(`Could not save file: ${errorMessage(error)}`, "error");
        pendingRef.current.set(fileId, content);
      }
    },
    [pushToast],
  );

  const flushAll = useCallback(async () => {
    await Promise.all([...pendingRef.current.keys()].map((fileId) => flushFile(fileId)));
  }, [flushFile]);

  const handleEditorChange = useCallback(
    (fileId: string, content: string) => {
      setWorkspace((current) =>
        current
          ? {
              ...current,
              files: current.files.map((file) =>
                file.id === fileId ? { ...file, content } : file,
              ),
            }
          : current,
      );
      const draft = workspaceRef.current;
      if (draft) {
        workspaceRef.current = {
          ...draft,
          files: draft.files.map((file) =>
            file.id === fileId ? { ...file, content } : file,
          ),
        };
      }
      pendingRef.current.set(fileId, content);
      setSaveState("saving");
      const previous = timersRef.current.get(fileId);
      if (previous) clearTimeout(previous);
      timersRef.current.set(
        fileId,
        setTimeout(() => {
          void flushFile(fileId);
        }, 420),
      );
    },
    [flushFile],
  );

  const handleSelectFile = useCallback(
    (fileId: string) => {
      const previous = activeFileRef.current;
      if (previous && previous !== fileId) void flushFile(previous);
      setActiveFileId(fileId);
      setSidebarOpen(false);
    },
    [flushFile],
  );

  const handleRun = useCallback(async () => {
    const current = workspaceRef.current;
    const target = activeFileRef.current;
    if (!current || !target || runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    setConsoleOpen(true);
    try {
      await flushFile(target);
      const { workspace: updated } = await api.runFile(
        current.id,
        target,
        userRef.current.name,
      );
      applyWorkspace(updated);
      if (isMobileRoom()) setRoomOpen(false);
    } catch (error) {
      pushToast(errorMessage(error), "error");
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  }, [applyWorkspace, flushFile, pushToast]);

  const handleAgentAction = useCallback(
    async (agentId: AgentId) => {
      const current = workspaceRef.current;
      if (!current) return;
      setTypingAgents((state) => ({ ...state, [agentId]: "thinking" }));
      try {
        const { workspace: updated } = await api.agentAction(
          current.id,
          agentId,
          AGENT_PRIMARY[agentId],
        );
        applyWorkspace(updated);
        setRoomTab("room");
        if (isMobileRoom()) setRoomOpen(true);
      } catch (error) {
        pushToast(`${agentId} could not finish: ${errorMessage(error)}`, "error");
      } finally {
        setTypingAgents((state) => {
          const next = { ...state };
          delete next[agentId];
          return next;
        });
      }
    },
    [applyWorkspace, pushToast],
  );

  const handleSendMessage = useCallback(
    async (text: string) => {
      const current = workspaceRef.current;
      if (!current) return;
      try {
        const updated = await api.sendMessage(current.id, {
          text,
          authorName: userRef.current.name,
          authorId: userRef.current.id,
        });
        applyWorkspace(updated);
      } catch (error) {
        pushToast(errorMessage(error), "error");
        throw error;
      }
    },
    [applyWorkspace, pushToast],
  );

  const handleUpdateTask = useCallback(
    async (task: Task, status: "todo" | "done") => {
      const current = workspaceRef.current;
      if (!current) return;
      try {
        const updated = await api.updateTask(current.id, task.id, status);
        applyWorkspace(updated);
      } catch (error) {
        pushToast(errorMessage(error), "error");
      }
    },
    [applyWorkspace, pushToast],
  );

  const handleAddTask = useCallback(
    async (title: string, agentId: AgentId | null) => {
      const current = workspaceRef.current;
      if (!current) return;
      try {
        const updated = await api.createTask(current.id, { title, agentId });
        applyWorkspace(updated);
      } catch (error) {
        pushToast(errorMessage(error), "error");
        throw error;
      }
    },
    [applyWorkspace, pushToast],
  );

  const handleSelectWorkspace = useCallback(
    async (workspaceId: string) => {
      if (!workspaceRef.current || workspaceRef.current.id === workspaceId) return;
      await flushAll();
      try {
        const loaded = await api.getWorkspace(workspaceId);
        applyWorkspace(loaded);
        setActiveFileId(
          loaded.files.find((file) => file.path === "src/main.js")?.id ??
            loaded.files[0]?.id ??
            "",
        );
        setPresence([]);
        setRoomTab("room");
        setRoomOpen(false);
        setSidebarOpen(false);
      } catch (error) {
        pushToast(`Could not open space: ${errorMessage(error)}`, "error");
      }
    },
    [applyWorkspace, flushAll, pushToast],
  );

  const handleCreateFile = useCallback(
    async (path: string, content: string) => {
      const current = workspaceRef.current;
      if (!current) return;
      await flushAll();
      try {
        const updated = await api.createFile(current.id, {
          path,
          content,
          authorName: userRef.current.name,
        });
        const existing = new Set(current.files.map((file) => file.id));
        const created = updated.files.find((file) => !existing.has(file.id));
        applyWorkspace(updated);
        if (created) setActiveFileId(created.id);
        pushToast(`Created ${created?.path ?? path}`, "success");
      } catch (error) {
        pushToast(errorMessage(error), "error");
        throw error;
      }
    },
    [applyWorkspace, flushAll, pushToast],
  );

  const handleDeleteFile = useCallback(
    async (file: Workspace["files"][number]) => {
      const current = workspaceRef.current;
      if (!current) return;
      if (!window.confirm(`Delete ${file.path} from this shared space?`)) return;
      try {
        const updated = await api.deleteFile(current.id, file.id, userRef.current.name);
        applyWorkspace(updated);
        if (activeFileRef.current === file.id) {
          setActiveFileId(updated.files[0]?.id ?? "");
        }
        pushToast(`Deleted ${file.path}`, "success");
      } catch (error) {
        pushToast(errorMessage(error), "error");
      }
    },
    [applyWorkspace, pushToast],
  );

  const handleCreateSpace = useCallback(
    async (name: string) => {
      try {
        await flushAll();
        const created = await api.createWorkspace(name);
        const list = await api.listWorkspaces();
        setSummaries(list);
        applyWorkspace(created);
        setActiveFileId(
          created.files.find((file) => file.path === "src/main.js")?.id ??
            created.files[0]?.id ??
            "",
        );
        setPresence([]);
        setRoomTab("room");
        pushToast(`Created ${created.name}`, "success");
      } catch (error) {
        pushToast(errorMessage(error), "error");
        throw error;
      }
    },
    [applyWorkspace, flushAll, pushToast],
  );

  const handleRename = useCallback(
    (name: string) => {
      const next = { ...userRef.current, name };
      setUser(next);
      saveUser(next);
      pushToast("Identity updated", "success");
    },
    [pushToast],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key === "Enter") {
        event.preventDefault();
        void handleRun();
      }
      if (modifier && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void flushAll();
      }
      if (event.key === "Escape") {
        setSidebarOpen(false);
        setRoomOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flushAll, handleRun]);

  if (booting) {
    return (
      <div className="boot-screen">
        <div className="boot-mark">
          <svg viewBox="0 0 32 32" width="46" height="46">
            <path
              d="M16 4.5l10 5.7v11.6L16 27.5 6 21.8V10.2z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <circle cx="16" cy="16" r="2.8" fill="currentColor" />
          </svg>
        </div>
        <span className="boot-word">Atelier</span>
        <span className="boot-line">
          <LoaderCircle size={14} className="spin" />
          Waking the shared sandbox
        </span>
      </div>
    );
  }

  if (bootError || !workspace) {
    return (
      <div className="boot-screen">
        <div className="boot-mark boot-mark--error">
          <AlertTriangle size={34} />
        </div>
        <span className="boot-word">The room is unreachable</span>
        <span className="boot-error">{bootError ?? "No workspace loaded"}</span>
        <button className="primary-btn" onClick={() => void bootstrap()}>
          <RotateCcw size={14} />
          Retry connection
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <TopBar
        workspace={workspace}
        workspaces={summaries}
        presence={presence}
        saveState={saveState}
        connected={connected}
        running={running}
        roomOpen={roomOpen}
        onRun={() => void handleRun()}
        onOpenModal={(kind) => setModal(kind)}
        onSelectWorkspace={(id) => void handleSelectWorkspace(id)}
        onNewSpace={() => setModal("new-space")}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onToggleRoom={() => setRoomOpen((open) => !open)}
      />

      <div className="app-body">
        <Sidebar
          workspace={workspace}
          activeFileId={activeFileId}
          health={health}
          presence={presence}
          user={user}
          onSelectFile={handleSelectFile}
          onDeleteFile={(file) => void handleDeleteFile(file)}
          onNewFile={() => setModal("new-file")}
          onAgentAction={(agentId) => void handleAgentAction(agentId)}
          onEditIdentity={() => setModal("profile")}
          open={sidebarOpen}
        />

        <Workbench
          workspace={workspace}
          activeFileId={activeFileId}
          presence={presence}
          saveState={saveState}
          running={running}
          consoleOpen={consoleOpen}
          onSelectFile={handleSelectFile}
          onChange={handleEditorChange}
          onRun={() => void handleRun()}
          onToggleConsole={() => setConsoleOpen((open) => !open)}
        />

        <RoomPanel
          workspace={workspace}
          presence={presence}
          user={user}
          typingAgents={typingAgents}
          tab={roomTab}
          open={roomOpen}
          onTabChange={setRoomTab}
          onSendMessage={handleSendMessage}
          onAgentAction={(agentId) => void handleAgentAction(agentId)}
          onUpdateTask={(task, status) => void handleUpdateTask(task, status)}
          onAddTask={handleAddTask}
          onClose={() => setRoomOpen(false)}
        />

        <div
          className={`scrim ${sidebarOpen || roomOpen ? "is-visible" : ""}`}
          onClick={() => {
            setSidebarOpen(false);
            setRoomOpen(false);
          }}
        />
      </div>

      {modal ? (
        <Modals
          modal={modal}
          workspace={workspace}
          user={user}
          presence={presence}
          onClose={() => setModal(null)}
          onCreateFile={handleCreateFile}
          onCreateSpace={handleCreateSpace}
          onRename={handleRename}
        />
      ) : null}

      {toast ? (
        <div className={`toast toast--${toast.tone}`} role="status">
          <span className="toast__dot" />
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
