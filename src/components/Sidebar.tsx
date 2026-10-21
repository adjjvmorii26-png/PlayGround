import {
  Brain,
  Box,
  Compass,
  Cpu,
  Eye,
  FlaskConical,
  Folder,
  Hammer,
  Pencil,
  Plus,
  Radio,
  ShieldCheck,
  Timer,
  Trash2,
  Wand2,
} from "lucide-react";
import type { AgentId, Health, Presence, Workspace, WorkspaceFile } from "@shared/types";
import type { LocalUser } from "@/lib/user";
import { Avatar } from "./Avatar";
import { FileGlyph } from "./FileGlyph";
import { baseName, dirName, colorFor } from "@/lib/format";

const AGENT_ACTION: Record<AgentId, { label: string; icon: typeof Compass }> = {
  atlas: { label: "Plan", icon: Compass },
  nova: { label: "Build", icon: Hammer },
  sage: { label: "Review", icon: Eye },
  echo: { label: "Test", icon: FlaskConical },
};

interface SidebarProps {
  workspace: Workspace;
  activeFileId: string;
  health: Health | null;
  presence: Presence[];
  user: LocalUser;
  onSelectFile: (fileId: string) => void;
  onDeleteFile: (file: WorkspaceFile) => void;
  onNewFile: () => void;
  onAgentAction: (agentId: AgentId) => void;
  onEditIdentity: () => void;
  open: boolean;
}

function groupFiles(files: WorkspaceFile[]): Array<[string, WorkspaceFile[]]> {
  const groups = new Map<string, WorkspaceFile[]>();
  for (const file of files) {
    const dir = dirName(file.path);
    const key = dir || "";
    const list = groups.get(key) ?? [];
    list.push(file);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === "") return -1;
      if (b === "") return 1;
      return a.localeCompare(b);
    })
    .map(([dir, list]) => [dir, list.sort((a, b) => a.path.localeCompare(b.path))]);
}

export function Sidebar({
  workspace,
  activeFileId,
  health,
  presence,
  user,
  onSelectFile,
  onDeleteFile,
  onNewFile,
  onAgentAction,
  onEditIdentity,
  open,
}: SidebarProps) {
  const groups = groupFiles(workspace.files);
  const sandbox = health?.sandbox ?? workspace.settings.sandbox;

  return (
    <aside className={`sidebar ${open ? "is-open" : ""}`}>
      <div className="sidebar__scroll">
        <div className="sidebar__heading">
          <span>Files</span>
          <span className="section-count">{workspace.files.length}</span>
          <button className="icon-btn icon-btn--tiny" onClick={onNewFile} title="New file">
            <Plus size={14} />
          </button>
        </div>

        <div className="file-tree">
          {groups.map(([folder, files]) => (
            <div className="file-group" key={folder || "root"}>
              {folder ? (
                <div className="file-group__label">
                  <Folder size={12} />
                  {folder}
                </div>
              ) : null}
              {files.map((file) => (
                <div
                  key={file.id}
                  className={`file-row ${file.id === activeFileId ? "is-active" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectFile(file.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectFile(file.id);
                    }
                  }}
                >
                  <FileGlyph language={file.language} size={14} />
                  <span className="file-row__name">{baseName(file.path)}</span>
                  <span
                    className="file-row__editor"
                    title={`Last edited by ${file.updatedBy}`}
                    style={{ background: colorFor(file.updatedBy) }}
                  />
                  <button
                    className="file-row__delete"
                    title={`Delete ${file.path}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteFile(file);
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          ))}
          {workspace.files.length === 0 ? (
            <button className="tree-empty" onClick={onNewFile}>
              <Plus size={14} /> Add the first file
            </button>
          ) : null}
        </div>

        <div className="sidebar__heading sidebar__heading--team">
          <span>Agents</span>
          <span className="section-count">
            {workspace.agents.filter((agent) => agent.status === "thinking").length
              ? "working"
              : "ready"}
          </span>
        </div>

        <div className="agent-list">
          {workspace.agents.map((agent) => {
            const action = AGENT_ACTION[agent.id];
            const ActionIcon = action.icon;
            const thinking = agent.status === "thinking";
            return (
              <button
                key={agent.id}
                className={`agent-card ${thinking ? "is-thinking" : ""}`}
                onClick={() => onAgentAction(agent.id)}
                title={`Ask ${agent.name} to ${action.label.toLowerCase()}`}
              >
                <Avatar
                  name={agent.name}
                  color={agent.color}
                  kind="agent"
                  status={agent.status}
                  size={30}
                />
                <span className="agent-card__body">
                  <span className="agent-card__top">
                    <strong>{agent.name}</strong>
                    <span className="agent-card__role">{agent.role}</span>
                  </span>
                  <span className="agent-card__tagline">
                    {thinking ? "Working in the room…" : agent.tagline}
                  </span>
                </span>
                <span className="agent-card__action">
                  {thinking ? (
                    <span className="thinking-bars" aria-label="thinking">
                      <i />
                      <i />
                      <i />
                    </span>
                  ) : (
                    <>
                      <ActionIcon size={13} />
                      <span>{action.label}</span>
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="sidebar__heading sidebar__heading--team">
          <span>Sandbox</span>
          <span className={`sandbox-badge ${sandbox === "docker" ? "is-hard" : ""}`}>
            {sandbox}
          </span>
        </div>

        <div className="env-card">
          <div className="env-card__title">
            <ShieldCheck size={14} />
            <span>Environment</span>
            <Box size={13} className="env-card__ghost" />
          </div>
          <div className="env-row">
            <span>
              <Cpu size={12} /> Runtime
            </span>
            <strong>{workspace.settings.runtime === "python" ? "Python 3" : "Node 22"}</strong>
          </div>
          <div className="env-row">
            <span>
              <Timer size={12} /> Limits
            </span>
            <strong>
              {workspace.settings.memoryMb} MB · {Math.round(workspace.settings.timeoutMs / 1000)}s
            </strong>
          </div>
          <div className="env-row">
            <span>
              <Radio size={12} /> Realtime
            </span>
            <strong>{health?.realtime ?? "memory"}</strong>
          </div>
          <div className="env-row">
            <span>
              <Brain size={12} /> Agent model
            </span>
            <strong>{health?.llm ? "LLM connected" : "Local reasoning"}</strong>
          </div>
          <div className="env-note">
            {sandbox === "docker"
              ? "Network off · read-only mount · ephemeral container"
              : "Ephemeral temp dir · capped output · host process"}
          </div>
        </div>

        <div className="sidebar__heading sidebar__heading--team">
          <span>Room</span>
          <span className="section-count">{presence.length || 1} human{presence.length === 1 ? "" : "s"}</span>
        </div>

        <div className="presence-card">
          <Avatar name={user.name} color={colorFor(user.id)} size={30} />
          <div className="presence-card__body">
            <strong>{user.name}</strong>
            <span>{presence.length > 1 ? `${presence.length - 1} other human online` : "You are the only human here"}</span>
          </div>
          <button className="icon-btn icon-btn--tiny" onClick={onEditIdentity} title="Edit display name">
            <Pencil size={13} />
          </button>
        </div>
      </div>

      <div className="sidebar__footer">
        <Wand2 size={13} />
        <span>Click an agent to hand off a move.</span>
        <kbd>⌘↵</kbd>
      </div>
    </aside>
  );
}
