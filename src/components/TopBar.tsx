import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Cloud,
  CloudOff,
  GitBranch,
  LoaderCircle,
  Menu,
  PanelRight,
  Play,
  Plus,
  Share2,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { Presence, Workspace, WorkspaceSummary } from "@shared/types";
import type { SaveState } from "@/lib/ui";
import { AvatarStack } from "./Avatar";

interface TopBarProps {
  workspace: Workspace;
  workspaces: WorkspaceSummary[];
  presence: Presence[];
  saveState: SaveState;
  connected: boolean;
  running: boolean;
  roomOpen: boolean;
  onRun: () => void;
  onOpenModal: (kind: "share") => void;
  onSelectWorkspace: (workspaceId: string) => void;
  onNewSpace: () => void;
  onToggleSidebar: () => void;
  onToggleRoom: () => void;
}

export function TopBar({
  workspace,
  workspaces,
  presence,
  saveState,
  connected,
  running,
  roomOpen,
  onRun,
  onOpenModal,
  onSelectWorkspace,
  onNewSpace,
  onToggleSidebar,
  onToggleRoom,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [menuOpen]);

  const saveLabel =
    saveState === "saving" ? "Saving" : saveState === "offline" ? "Offline" : "Saved";

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button
          className="icon-btn topbar__menu"
          onClick={onToggleSidebar}
          aria-label="Toggle workspace panel"
        >
          <Menu size={18} />
        </button>
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="22" height="22">
              <path
                d="M16 4.5l10 5.7v11.6L16 27.5 6 21.8V10.2z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              />
              <circle cx="16" cy="16" r="2.8" fill="currentColor" />
            </svg>
          </span>
          <span className="brand__name">Atelier</span>
          <span className="brand__badge">beta</span>
        </div>

        <span className="topbar__divider" />

        <div className="workspace-switch" ref={menuRef}>
          <button
            className="workspace-switch__button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
          >
            <span className="workspace-switch__glyph">
              {workspace.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="workspace-switch__text">
              <strong>{workspace.name}</strong>
              <small>{workspaces.length} shared space{workspaces.length === 1 ? "" : "s"}</small>
            </span>
            <ChevronDown size={14} className={menuOpen ? "rotate" : ""} />
          </button>

          {menuOpen ? (
            <div className="workspace-menu">
              <div className="workspace-menu__label">Your spaces</div>
              {workspaces.map((entry) => (
                <button
                  key={entry.id}
                  className={`workspace-menu__item ${entry.id === workspace.id ? "is-active" : ""}`}
                  onClick={() => {
                    setMenuOpen(false);
                    if (entry.id !== workspace.id) onSelectWorkspace(entry.id);
                  }}
                >
                  <span className="workspace-menu__badge">
                    {entry.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="workspace-menu__body">
                    <strong>{entry.name}</strong>
                    <small>
                      {entry.fileCount} files · {entry.openTasks} open
                    </small>
                  </span>
                  {entry.id === workspace.id ? <Check size={14} /> : null}
                </button>
              ))}
              <button
                className="workspace-menu__new"
                onClick={() => {
                  setMenuOpen(false);
                  onNewSpace();
                }}
              >
                <Plus size={14} />
                New shared space
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="topbar__center">
        <span className="branch-chip">
          <GitBranch size={12} />
          main
        </span>
        <span className="crumb-divider">/</span>
        <span className="crumb-text">{workspace.name.toLowerCase().replace(/\s+/g, "-")}</span>
        <span className={`status-pill ${connected ? "is-live" : "is-down"}`}>
          {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
          {connected ? "Live" : "Reconnecting"}
        </span>
      </div>

      <div className="topbar__right">
        <span className={`save-chip save-chip--${saveState}`}>
          {saveState === "saving" ? (
            <LoaderCircle size={12} className="spin" />
          ) : saveState === "offline" ? (
            <CloudOff size={12} />
          ) : (
            <Cloud size={12} />
          )}
          <span>{saveLabel}</span>
        </span>

        <AvatarStack
          people={presence.map((person) => ({
            id: person.userId,
            name: person.name,
            color: person.color,
          }))}
          max={3}
        />

        <button className="ghost-btn share-btn" onClick={() => onOpenModal("share")}>
          <Share2 size={14} />
          <span>Share</span>
        </button>

        <button className="run-button" onClick={onRun} disabled={running}>
          {running ? (
            <LoaderCircle size={14} className="spin" />
          ) : (
            <Play size={13} fill="currentColor" />
          )}
          <span>{running ? "Running" : "Run"}</span>
          <kbd>⌘↵</kbd>
        </button>

        <button
          className={`icon-btn room-toggle ${roomOpen ? "is-active" : ""}`}
          onClick={onToggleRoom}
          aria-label="Toggle room panel"
        >
          <PanelRight size={18} />
        </button>
      </div>
    </header>
  );
}
